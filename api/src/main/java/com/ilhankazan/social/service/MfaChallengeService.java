package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.MfaChallenge;
import com.ilhankazan.social.repository.MfaChallengeRepository;
import com.ilhankazan.social.security.JwtTokenProvider;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Server-side record for an in-progress second factor.
 *
 * The challenge token is a JWT, which on its own proves only that we minted it — so one token
 * could complete MFA repeatedly, outlive logout-all and a password change, and offer an unbounded
 * number of guesses. Binding it to a row by its jti makes the challenge single-use, countable and
 * revocable.
 */
@Service
@RequiredArgsConstructor
public class MfaChallengeService {

    /** Guesses allowed against one challenge before it is burned and a fresh login is required. */
    static final int MAX_ATTEMPTS_PER_CHALLENGE = 5;
    /**
     * Guesses allowed per account across all challenges in the window. Without this, burning a
     * challenge costs an attacker only another login, so the per-challenge cap alone would not
     * bound the total guess rate.
     */
    static final int MAX_FAILURES_PER_ACCOUNT = 10;
    static final Duration ACCOUNT_FAILURE_WINDOW = Duration.ofMinutes(15);

    private final MfaChallengeRepository repository;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public String issue(Account account) {
        String tokenId = UUID.randomUUID().toString();

        repository.save(MfaChallenge.builder()
            .account(account)
            .tokenId(tokenId)
            .expiresAt(Instant.now().plusMillis(JwtTokenProvider.MFA_CHALLENGE_TTL_MS))
            .build());

        return jwtTokenProvider.generateMfaToken(account.getId(), tokenId);
    }

    @Transactional(readOnly = true)
    public MfaChallenge validateAndGet(String mfaToken) {
        JwtTokenProvider.MfaTokenClaims claims;
        try {
            claims = jwtTokenProvider.parseMfaToken(mfaToken);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BadCredentialsException("MFA session is invalid or has expired.");
        }

        MfaChallenge challenge = repository.findByTokenId(claims.tokenId())
            .orElseThrow(() -> new BadCredentialsException("MFA session is invalid or has expired."));

        if (challenge.getConsumedAt() != null
            || challenge.getExpiresAt().isBefore(Instant.now())
            || challenge.getFailedAttempts() >= MAX_ATTEMPTS_PER_CHALLENGE) {
            throw new BadCredentialsException("MFA session is invalid or has expired.");
        }

        if (isAccountLocked(challenge.getAccount().getId())) {
            throw new BadCredentialsException("Too many failed verification attempts. Try again later.");
        }

        return challenge;
    }

    @Transactional(readOnly = true)
    public boolean isAccountLocked(Long accountId) {
        return repository.countRecentFailures(accountId, Instant.now().minus(ACCOUNT_FAILURE_WINDOW))
            >= MAX_FAILURES_PER_ACCOUNT;
    }

    /**
     * Runs in its own transaction: the caller throws right after, which would otherwise roll the
     * increment back — the bug that made MfaEmailService's attempt cap dead code.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(String tokenId) {
        repository.incrementFailedAttempts(tokenId);
        repository.burnIfAttemptsExhausted(tokenId, MAX_ATTEMPTS_PER_CHALLENGE);
    }

    /**
     * @return true for the one caller that consumed the challenge; false if it was already spent,
     *         which concurrent verifications of the same token must be rejected on.
     */
    @Transactional
    public boolean consume(String tokenId) {
        return repository.consumeIfActive(tokenId) > 0;
    }

    @Transactional
    public void invalidateAllForAccount(Long accountId) {
        repository.consumeActiveForAccount(accountId);
    }
}
