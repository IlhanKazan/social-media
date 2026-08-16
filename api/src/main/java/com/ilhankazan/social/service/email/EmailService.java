package com.ilhankazan.social.service.email;

import com.ilhankazan.social.entity.EmailOutbox;
import com.ilhankazan.social.entity.EmailStatus;
import com.ilhankazan.social.repository.EmailOutboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailOutboxRepository outboxRepository;
    private final EmailTemplateRegistry templateRegistry;
    private final UnsubscribeTokenService unsubscribeTokens;
    private final Environment env;

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
        return apiOrigin() + "/api/v1/email/unsubscribe?token=" + unsubscribeTokens.sign(msg.accountId());
    }

    /**
     * Base for the unsubscribe link.
     *
     * This one is the API, not the site: the SPA's nginx does not proxy /api,
     * so a link built from the frontend origin would land on the 404 page — and
     * one-click unsubscribe POSTs straight at the URL, with no page to run.
     *
     * COOLIFY_URL is injected by the platform and already holds the API's public
     * address, so nothing new has to be configured for this to be right.
     */
    private String apiOrigin() {
        String origin = env.getProperty("API_ORIGIN",
            env.getProperty("COOLIFY_URL", "http://localhost:8080"));
        return origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin;
    }

    @Transactional(readOnly = true)
    public long countByStatusSince(EmailStatus status, java.time.Instant since) {
        return outboxRepository.countByStatusAndSentAtAfter(status, since);
    }
}
