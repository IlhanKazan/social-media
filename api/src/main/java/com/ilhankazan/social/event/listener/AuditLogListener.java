package com.ilhankazan.social.event.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.entity.AuditLog;
import com.ilhankazan.social.event.AuditLogEvent;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogListener {

    private final AuditLogRepository auditLogRepository;
    private final AccountRepository accountRepository;
    private final ObjectMapper objectMapper;

    @Async
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleAuditLogEvent(AuditLogEvent event) {
        try {
            AuditLog.AuditLogBuilder builder = AuditLog.builder()
                .action(event.action())
                .targetType(event.targetType())
                .targetId(event.targetId())
                .ipAddress(event.ipAddress())
                .userAgent(event.userAgent());

            if (event.username() != null) {
                accountRepository.findByUsername(event.username()).ifPresent(account -> {
                    builder.actor(account);
                    builder.actorUsername(account.getUsername());
                });
            }

            if (event.metadata() != null && !event.metadata().isEmpty()) {
                builder.metadata(objectMapper.writeValueAsString(event.metadata()));
            }

            auditLogRepository.save(builder.build());
        } catch (Exception e) {
            log.error("Failed to write audit log: {}", event.action(), e);
        }
    }
}
