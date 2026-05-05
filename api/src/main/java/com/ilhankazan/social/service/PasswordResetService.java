package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.PasswordResetToken;
import com.ilhankazan.social.repository.PasswordResetTokenRepository;
import com.ilhankazan.social.util.TokenGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetTokenRepository repository;

    @Transactional
    public String createResetToken(Account account, String ipAddress) {
        repository.invalidateActiveTokensForAccount(account.getId());

        String plainToken = TokenGenerator.generateSecureToken();

        PasswordResetToken token = PasswordResetToken.builder()
            .account(account)
            .tokenHash(TokenGenerator.hashToken(plainToken))
            .expiresAt(Instant.now().plus(30, ChronoUnit.MINUTES))
            .requestedIp(ipAddress)
            .build();

        repository.save(token);
        return plainToken;
    }

    @Transactional
    public Account validateAndConsumeToken(String plainToken) {
        String tokenHash = TokenGenerator.hashToken(plainToken);

        PasswordResetToken resetToken = repository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new IllegalArgumentException("Geçersiz veya süresi dolmuş token."));

        if (resetToken.getUsedAt() != null) throw new IllegalArgumentException("Bu token zaten kullanılmış.");
        if (resetToken.getExpiresAt().isBefore(Instant.now())) throw new IllegalArgumentException("Bu tokenin süresi dolmuş.");

        resetToken.setUsedAt(Instant.now());
        repository.save(resetToken);

        return resetToken.getAccount();
    }
}
