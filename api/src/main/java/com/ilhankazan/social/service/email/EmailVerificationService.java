package com.ilhankazan.social.service.email;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.EmailVerificationToken;
import com.ilhankazan.social.repository.EmailVerificationTokenRepository;
import com.ilhankazan.social.util.TokenGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private final EmailVerificationTokenRepository repository;

    @Transactional
    public String createVerificationToken(Account account) {
        repository.invalidateActiveTokensForAccount(account.getId());

        String plainToken = TokenGenerator.generateSecureToken();

        EmailVerificationToken token = EmailVerificationToken.builder()
            .account(account)
            .tokenHash(TokenGenerator.hashToken(plainToken))
            .expiresAt(Instant.now().plus(24, ChronoUnit.HOURS))
            .build();

        repository.save(token);
        return plainToken;
    }

    @Transactional
    public EmailVerificationToken validateAndConsumeToken(String plainToken) {
        String tokenHash = TokenGenerator.hashToken(plainToken);

        EmailVerificationToken token = repository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new IllegalArgumentException("Geçersiz veya süresi dolmuş bağlantı."));

        if (token.getUsedAt() != null) throw new IllegalArgumentException("Bu bağlantı daha önce kullanılmış.");
        if (token.getExpiresAt().isBefore(Instant.now())) throw new IllegalArgumentException("Bu bağlantının süresi dolmuş.");

        token.setUsedAt(Instant.now());
        return repository.save(token);
    }
}
