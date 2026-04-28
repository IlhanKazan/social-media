package com.ilhankazan.social.service;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.RefreshToken;
import com.ilhankazan.social.exception.TokenReuseDetectedException;
import com.ilhankazan.social.repository.RefreshTokenRepository;
import com.ilhankazan.social.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {
    private static final Logger reuseLogger = LoggerFactory.getLogger("security.auth.reuse");

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final AppProperties.JwtProperties jwtProps;

    public record RefreshResult(String accessToken, String refreshToken, Account account) {}

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }

    @Transactional
    public String issue(Account account, UUID familyId, String userAgent, String ipAddress) {
        String plainToken = jwtTokenProvider.generateRefreshToken(account.getUsername());
        String hash = hashToken(plainToken);

        RefreshToken r = new RefreshToken();
        r.setAccount(account);
        r.setTokenHash(hash);
        r.setFamilyId(familyId);
        r.setExpiresAt(Instant.now().plusMillis(jwtProps.refreshTtlMs()));
        r.setUserAgent(userAgent);
        r.setIpAddress(ipAddress);
        refreshTokenRepository.save(r);

        return plainToken;
    }

    @Transactional
    public RefreshResult rotate(String presentedToken, String userAgent, String ipAddress) {
        String hash = hashToken(presentedToken);
        RefreshToken existing = refreshTokenRepository.findByTokenHash(hash)
            .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        if (existing.getRevokedAt() != null) {
            refreshTokenRepository.revokeFamily(existing.getFamilyId());
            reuseLogger.warn("Refresh token reuse detected! account_id={} family_id={} ip_address={} user_agent={} presented_at={}",
                existing.getAccount().getId(), existing.getFamilyId(), ipAddress, userAgent, Instant.now());
            throw new TokenReuseDetectedException("Token reuse detected. All sessions for this device have been revoked.");
        }

        if (existing.getExpiresAt().isBefore(Instant.now())) {
            throw new BadCredentialsException("Refresh token expired");
        }

        existing.setRevokedAt(Instant.now());

        String newPlainToken = jwtTokenProvider.generateRefreshToken(existing.getAccount().getUsername());
        String newHash = hashToken(newPlainToken);

        existing.setReplacedBy(newHash);
        refreshTokenRepository.save(existing);

        RefreshToken newToken = new RefreshToken();
        newToken.setAccount(existing.getAccount());
        newToken.setTokenHash(newHash);
        newToken.setFamilyId(existing.getFamilyId());
        newToken.setExpiresAt(Instant.now().plusMillis(jwtProps.refreshTtlMs()));
        newToken.setUserAgent(userAgent);
        newToken.setIpAddress(ipAddress);
        refreshTokenRepository.save(newToken);

        String newAccessToken = jwtTokenProvider.generateAccessToken(
            existing.getAccount().getUsername(),
            List.of(existing.getAccount().getRole().getName())
        );

        return new RefreshResult(newAccessToken, newPlainToken, existing.getAccount());
    }

    @Transactional
    public void revokeFamilyByToken(String plainToken) {
        String hash = hashToken(plainToken);
        refreshTokenRepository.findByTokenHash(hash)
            .ifPresent(rt -> refreshTokenRepository.revokeFamily(rt.getFamilyId()));
    }

    @Transactional
    public void revokeAllForAccount(Long accountId) {
        refreshTokenRepository.revokeByAccountId(accountId);
    }
}
