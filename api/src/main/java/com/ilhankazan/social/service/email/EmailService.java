package com.ilhankazan.social.service.email;

import com.ilhankazan.social.entity.EmailOutbox;
import com.ilhankazan.social.entity.EmailStatus;
import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.repository.EmailOutboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailOutboxRepository outboxRepository;
    private final EmailTemplateRegistry templateRegistry;
    private final UnsubscribeTokenService unsubscribeTokens;
    private final AppProperties.EmailProperties emailProps;

    @Transactional
    public Long enqueue(EmailMessage msg) {
        String unsubscribeUrl = unsubscribeUrlFor(msg);
        EmailTemplateRegistry.Rendered rendered = templateRegistry.render(
            msg.template(), msg.language(), msg.category(), unsubscribeUrl, msg.templateParams());

        // The template owns the subject so it can be localised; an explicit one
        // is only honoured for ad-hoc mail that has no template copy.
        String subject = msg.subject() != null && !msg.subject().isBlank()
            ? msg.subject() : rendered.subject();

        EmailOutbox outbox = EmailOutbox.builder()
            .toAddress(msg.to())
            .subject(subject)
            .bodyHtml(rendered.html())
            .bodyText(rendered.text())
            .unsubscribeUrl(unsubscribeUrl)
            .template(msg.template())
            .status(EmailStatus.PENDING)
            .attempts(0)
            .build();

        return outboxRepository.save(outbox).getId();
    }

    private String unsubscribeUrlFor(EmailMessage msg) {
        if (!msg.category().isUnsubscribable() || msg.accountId() == null) {
            return null;
        }
        return webUrl() + "/api/v1/email/unsubscribe?token=" + unsubscribeTokens.sign(msg.accountId());
    }

    private String webUrl() {
        String logo = emailProps.logoUrl();
        if (logo != null && logo.startsWith("http")) {
            int slash = logo.indexOf('/', logo.indexOf("//") + 2);
            if (slash > 0) return logo.substring(0, slash);
        }
        return "https://socialhan.ilhankazan.com";
    }

    @Transactional(readOnly = true)
    public long countByStatusSince(EmailStatus status, java.time.Instant since) {
        return outboxRepository.countByStatusAndSentAtAfter(status, since);
    }
}
