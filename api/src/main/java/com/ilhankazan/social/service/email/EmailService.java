package com.ilhankazan.social.service.email;

import com.ilhankazan.social.entity.EmailOutbox;
import com.ilhankazan.social.entity.EmailStatus;
import com.ilhankazan.social.repository.EmailOutboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailOutboxRepository outboxRepository;
    private final EmailTemplateRegistry templateRegistry;

    @Transactional
    public Long enqueue(EmailMessage msg) {
        String html = templateRegistry.renderHtml(msg.template(), msg.templateParams());
        String text = templateRegistry.renderText(msg.template(), msg.templateParams());

        EmailOutbox outbox = EmailOutbox.builder()
            .toAddress(msg.to())
            .subject(msg.subject())
            .bodyHtml(html)
            .bodyText(text)
            .template(msg.template())
            .status(EmailStatus.PENDING)
            .attempts(0)
            .build();

        return outboxRepository.save(outbox).getId();
    }
}
