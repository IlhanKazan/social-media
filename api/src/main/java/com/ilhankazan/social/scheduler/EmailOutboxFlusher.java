package com.ilhankazan.social.scheduler;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.entity.EmailOutbox;
import com.ilhankazan.social.entity.EmailStatus;
import com.ilhankazan.social.repository.EmailOutboxRepository;
import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailOutboxFlusher {

    private final EmailOutboxRepository outboxRepository;
    private final Optional<Resend> resendOpt;
    private final AppProperties.EmailProperties emailProps;
    private final JdbcTemplate jdbcTemplate;

    private static final int ADVISORY_LOCK_ID = 7421;

    // Transaction-scoped lock: session-level pg_try_advisory_lock over a pooled
    // JdbcTemplate can lock and unlock on different connections, leaking the lock.
    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void flush() {
        if (!emailProps.enabled() || resendOpt.isEmpty()) {
            return;
        }

        Boolean lockAcquired = jdbcTemplate.queryForObject("SELECT pg_try_advisory_xact_lock(?)", Boolean.class, ADVISORY_LOCK_ID);
        if (Boolean.FALSE.equals(lockAcquired)) {
            return;
        }

        long sentLast24h = outboxRepository.countByStatusAndSentAtAfter(EmailStatus.SENT, Instant.now().minus(24, ChronoUnit.HOURS));
        if (sentLast24h >= emailProps.dailyCap()) {
            log.warn("Email daily cap reached ({}). Outbox processing paused.", sentLast24h);
            return;
        }

        long sentLast30d = outboxRepository.countByStatusAndSentAtAfter(EmailStatus.SENT, Instant.now().minus(30, ChronoUnit.DAYS));
        if (sentLast30d >= emailProps.monthlyCap()) {
            log.warn("Email monthly cap reached ({}). Outbox processing paused.", sentLast30d);
            return;
        }

        List<EmailOutbox> pendings = outboxRepository.findTop10ByStatusOrderByCreatedAtAsc(EmailStatus.PENDING);
        int sentInTick = 0;

        for (EmailOutbox pending : pendings) {
            if (sentInTick >= 4) break;

            try {
                CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(emailProps.fromName() + " <" + emailProps.fromAddress() + ">")
                    .to(pending.getToAddress())
                    .subject(pending.getSubject())
                    .html(pending.getBodyHtml())
                    .text(pending.getBodyText())
                    .build();

                CreateEmailResponse data = resendOpt.get().emails().send(params);

                pending.setStatus(EmailStatus.SENT);
                pending.setSentAt(Instant.now());
                pending.setProviderMessageId(data.getId());
                sentInTick++;

            } catch (Exception e) {
                pending.setAttempts(pending.getAttempts() + 1);
                pending.setLastError(e.getMessage());

                if (pending.getAttempts() >= 5) {
                    pending.setStatus(EmailStatus.SKIPPED);
                    log.error("Email definitively failed after 5 attempts. Outbox ID: {}", pending.getId());
                } else if (e.getMessage() != null && !e.getMessage().contains("429")) {
                    pending.setStatus(EmailStatus.FAILED);
                }
            }
            outboxRepository.save(pending);
        }
    }
}
