package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.MfaRecoveryCode;
import com.ilhankazan.social.repository.MfaRecoveryCodeRepository;
import com.ilhankazan.social.util.TokenGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MfaRecoveryService {

    private static final int CODE_COUNT = 10;
    private static final int CODE_LENGTH = 10;

    private final MfaRecoveryCodeRepository repository;

    /** Replaces any existing codes with a fresh batch; returns the plaintext codes to show once. */
    @Transactional
    public List<String> regenerate(Account account) {
        repository.deleteAllForAccount(account.getId());
        List<String> plain = new ArrayList<>(CODE_COUNT);
        for (int i = 0; i < CODE_COUNT; i++) {
            String code = TokenGenerator.generateSecureToken()
                .replaceAll("[^a-zA-Z0-9]", "")
                .substring(0, CODE_LENGTH)
                .toLowerCase();
            plain.add(code);
            repository.save(MfaRecoveryCode.builder()
                .account(account)
                .codeHash(TokenGenerator.hashToken(code))
                .build());
        }
        return plain;
    }

    @Transactional
    public boolean consume(Long accountId, String code) {
        return repository
            .findByAccountIdAndCodeHashAndUsedAtIsNull(accountId, TokenGenerator.hashToken(code.trim().toLowerCase()))
            .map(rc -> {
                rc.setUsedAt(Instant.now());
                repository.save(rc);
                return true;
            })
            .orElse(false);
    }

    @Transactional
    public void clear(Long accountId) {
        repository.deleteAllForAccount(accountId);
    }
}
