package com.ilhankazan.social.scheduler;

import com.ilhankazan.social.service.AuditLogService;
import com.ilhankazan.social.service.PostService;
import com.ilhankazan.social.service.email.EmailMessage;
import com.ilhankazan.social.service.email.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class SpamBurstMonitor {

    private final PostService postService;
    private final EmailService emailService;
    private final AuditLogService auditLogService;

    private Instant lastAlertSentAt = Instant.MIN;

    @Scheduled(fixedRate = 60000)
    public void checkSpamBurst() {
        Instant tenMinsAgo = Instant.now().minus(10, ChronoUnit.MINUTES);
        long flaggedCount = postService.countFlaggedPostsSince(tenMinsAgo);

        if (flaggedCount > 20) {
            if (Instant.now().isAfter(lastAlertSentAt.plus(30, ChronoUnit.MINUTES))) {
                log.warn("Spam burst detected! {} flagged posts in the last 10 minutes.", flaggedCount);

                auditLogService.record("SPAM_BURST_DETECTED", "SYSTEM", null, Map.of("count", flaggedCount));

                emailService.enqueue(new EmailMessage(
                    "",
                    "Spam Burst Alert",
                    "ADMIN_ALERT",
                    Map.of("flaggedCount", String.valueOf(flaggedCount))
                ));

                lastAlertSentAt = Instant.now();
            }
        }
    }
}
