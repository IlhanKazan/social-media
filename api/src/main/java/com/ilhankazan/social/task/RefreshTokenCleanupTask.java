package com.ilhankazan.social.task;

import com.ilhankazan.social.repository.BlacklistedTokenRepository;
import com.ilhankazan.social.repository.PasswordResetTokenRepository;
import com.ilhankazan.social.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
public class RefreshTokenCleanupTask {
    private static final Logger log = LoggerFactory.getLogger(RefreshTokenCleanupTask.class);

    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final BlacklistedTokenRepository blacklistedTokenRepository;

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredTokens() {
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);

        int deletedRefresh = refreshTokenRepository.deleteByExpiresAtBefore(cutoff);
        log.info("Cleaned up {} expired refresh tokens older than {}", deletedRefresh, cutoff);

        int deletedReset = passwordResetTokenRepository.deleteByExpiresAtBefore(cutoff);
        log.info("Cleaned up {} expired password reset tokens older than {}", deletedReset, cutoff);

        blacklistedTokenRepository.deleteExpired(Instant.now());
        log.info("Cleaned up expired blacklisted tokens");
    }
}
