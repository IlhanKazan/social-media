package com.ilhankazan.social.task;

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

    @Scheduled(cron = "0 0 3 * * *") // Her gün gece 03:00'te çalışır
    @Transactional
    public void cleanupExpiredTokens() {
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
        int deleted = refreshTokenRepository.deleteByExpiresAtBefore(cutoff);
        log.info("Cleaned up {} expired refresh tokens older than {}", deleted, cutoff);
    }
}
