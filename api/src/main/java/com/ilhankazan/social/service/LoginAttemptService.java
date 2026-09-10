package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Per-account brute-force bound for /auth/login.
 *
 * The @RateLimit bucket is keyed by IP and lives in process, so it neither survives a source-address
 * rotation nor aggregates across replicas — against distributed credential stuffing it bounds
 * nothing. This counter is per account and in the database, so it bounds the total guess rate no
 * matter where the guesses come from.
 *
 * Unlike the MFA challenge counter, this one can be burned by anyone who knows a username, which
 * makes a targeted lockout possible. That is why the lock is short and why password reset stays
 * open while it holds — see docs/security/known-issues.md.
 */
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    static final int MAX_FAILED_ATTEMPTS = 10;
    static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

    private final AccountRepository accountRepository;

    /**
     * Throws the same exception a wrong password does. GlobalExceptionHandler flattens every
     * BadCredentialsException to one generic message, so a locked account is indistinguishable
     * from a wrong password and from an account that does not exist.
     */
    @Transactional(readOnly = true)
    public void assertNotLocked(String identifier) {
        find(identifier).ifPresent(account -> {
            if (account.getLockoutUntil() != null && account.getLockoutUntil().isAfter(Instant.now())) {
                throw new BadCredentialsException("Account is temporarily locked");
            }
        });
    }

    /** Its own transaction: the caller rethrows the authentication failure, rolling its own back. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(String identifier) {
        find(identifier).ifPresent(account -> accountRepository.recordFailedLogin(
            account.getId(), MAX_FAILED_ATTEMPTS, Instant.now().plus(LOCKOUT_DURATION)));
    }

    @Transactional
    public void recordSuccess(Long accountId) {
        accountRepository.clearLoginFailures(accountId);
    }

    private Optional<Account> find(String identifier) {
        return accountRepository.findByUsername(identifier)
            .or(() -> accountRepository.findByEmail(identifier));
    }
}
