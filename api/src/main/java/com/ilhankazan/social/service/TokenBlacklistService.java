package com.ilhankazan.social.service;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.entity.BlacklistedToken;
import com.ilhankazan.social.repository.BlacklistedTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private final BlacklistedTokenRepository repository;
    private final AppProperties.JwtProperties jwtProps;

    @Transactional
    public void addToBlacklist(String token) {
        String hash = sha256(token);
        if (!repository.existsByTokenHash(hash)) {
            Instant expiresAt = Instant.now().plusMillis(jwtProps.accessTtlMs());
            repository.save(BlacklistedToken.builder()
                .tokenHash(hash)
                .expiresAt(expiresAt)
                .build());
        }
    }

    @Transactional(readOnly = true)
    public boolean isBlacklisted(String token) {
        return repository.existsByTokenHash(sha256(token));
    }

    private static String sha256(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
