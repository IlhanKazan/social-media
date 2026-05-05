package com.ilhankazan.social.service;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.RefreshToken;
import com.ilhankazan.social.exception.TokenReuseDetectedException;
import com.ilhankazan.social.repository.RefreshTokenRepository;
import com.ilhankazan.social.security.JwtTokenProvider;
import com.ilhankazan.social.util.TokenGenerator;
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
    private final AuditLogService auditLogService;

    public record RefreshResult(String accessToken, String refreshToken, Account account) {}

    @Transactional
    public String issue(Account account, UUID familyId, String userAgent, String ipAddress) {
        String plainToken = jwtTokenProvider.generateRefreshToken(account.getUsername());
        String hash = TokenGenerator.hashToken(plainToken);

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
        String hash = TokenGenerator.hashToken(presentedToken);
        RefreshToken existing = refreshTokenRepository.findByTokenHash(hash)
            .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        if (existing.getRevokedAt() != null) {
            refreshTokenRepository.revokeFamily(existing.getFamilyId());
            reuseLogger.warn("Refresh token reuse detected! account_id={} family_id={} ip_address={} user_agent={} presented_at={}",
                existing.getAccount().getId(), existing.getFamilyId(), ipAddress, userAgent, Instant.now());

            auditLogService.record("TOKEN_REUSE_DETECTED", "ACCOUNT", existing.getAccount().getId(), java.util.Map.of("family_id", existing.getFamilyId()));

            throw new TokenReuseDetectedException("Token reuse detected. All sessions for this device have been revoked.");
        }

        if (existing.getExpiresAt().isBefore(Instant.now())) {
            throw new BadCredentialsException("Refresh token expired");
        }

        existing.setRevokedAt(Instant.now());

        String newPlainToken = jwtTokenProvider.generateRefreshToken(existing.getAccount().getUsername());
        String newHash = TokenGenerator.hashToken(newPlainToken);

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
        String hash = TokenGenerator.hashToken(plainToken);
        refreshTokenRepository.findByTokenHash(hash)
            .ifPresent(rt -> refreshTokenRepository.revokeFamily(rt.getFamilyId()));
    }

    @Transactional
    public void revokeAllForAccount(Long accountId) {
        refreshTokenRepository.revokeByAccountId(accountId);
    }
}
