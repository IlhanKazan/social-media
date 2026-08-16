package com.ilhankazan.social.manager;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.dto.admin.AnnouncementRequest;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.EmailStatus;
import com.ilhankazan.social.exception.AppException;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.service.AuditLogService;
import com.ilhankazan.social.service.email.EmailCategory;
import com.ilhankazan.social.service.email.EmailMessage;
import com.ilhankazan.social.service.email.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * Broadcasts an announcement to accounts that still accept optional email.
 *
 * Deliberately routed through the outbox rather than sent from the provider's
 * own dashboard. A dashboard blast bypasses everything that makes this safe:
 * the opt-out list, the monthly cap, per-recipient localisation, the audit
 * trail, and the retry behaviour. The only thing it saves is writing this class.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnnouncementManager {

    private final AccountRepository accountRepository;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final AppProperties.EmailProperties emailProps;

    public record Audience(long recipients, long sentThisMonth, long monthlyCap, long remaining) {
        public boolean fits() {
            return recipients <= remaining;
        }
    }

    @Transactional(readOnly = true)
    public Audience preview() {
        long recipients = accountRepository.countByEmailNotificationsEnabledTrueAndDeletedAtIsNullAndEmailVerifiedTrue();
        long sent = emailService.countByStatusSince(EmailStatus.SENT, Instant.now().minus(30, ChronoUnit.DAYS));
        long cap = emailProps.monthlyCap();
        return new Audience(recipients, sent, cap, Math.max(cap - sent, 0));
    }

    @Transactional
    public int send(AnnouncementRequest request) {
        Audience audience = preview();

        // The count is echoed back from the preview the admin actually saw. If
        // the audience moved since, this refuses rather than quietly mailing a
        // different set of people than the screen promised.
        if (request.confirm() != audience.recipients()) {
            throw new AppException(HttpStatus.CONFLICT, "AUDIENCE_CHANGED",
                "Recipient count changed since preview: expected " + request.confirm()
                    + ", now " + audience.recipients());
        }

        // The provider allowance is monthly and shared with transactional mail,
        // which must never be crowded out by a broadcast — a password reset that
        // cannot be sent locks someone out of their account.
        if (!audience.fits()) {
            throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, "QUOTA_EXCEEDED",
                "Announcement would exceed the monthly email allowance: "
                    + audience.recipients() + " needed, " + audience.remaining() + " left");
        }

        List<Account> recipients =
            accountRepository.findByEmailNotificationsEnabledTrueAndDeletedAtIsNullAndEmailVerifiedTrue();

        for (Account account : recipients) {
            emailService.enqueue(EmailMessage.notification(
                account.getEmail(),
                null,
                "NOTIFICATION_DIGEST",
                Map.of("message", request.message(), "link", request.linkUrl(), "title", request.title()),
                account.getPreferredLanguage(),
                account.getId()
            ));
        }

        auditLogService.record("ANNOUNCEMENT_SENT", "EMAIL", null, Map.of(
            "title", request.title(),
            "recipients", recipients.size()
        ));
        log.info("Announcement queued for {} recipients", recipients.size());

        return recipients.size();
    }
}
