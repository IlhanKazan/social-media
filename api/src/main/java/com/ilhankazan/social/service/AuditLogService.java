package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.AuditLog;
import com.ilhankazan.social.event.AuditLogEvent;
import com.ilhankazan.social.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final ApplicationEventPublisher eventPublisher;
    private final AuditLogRepository auditLogRepository;

    public void record(String action, String targetType, Long targetId, Map<String, Object> metadata) {
        String username = null;
        String ip = null;
        String ua = null;

        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
                username = auth.getName();
            }

            var attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes sra) {
                var req = sra.getRequest();
                ip = req.getHeader("X-Forwarded-For");
                if (ip == null) ip = req.getRemoteAddr();
                else ip = ip.split(",")[0].trim();
                ua = req.getHeader("User-Agent");
            }
        } catch (Exception ignored) {}

        eventPublisher.publishEvent(new AuditLogEvent(username, action, targetType, targetId, metadata, ip, ua));
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getFilteredLogs(String action, Long actorId, String targetType, Long targetId, Pageable pageable) {
        return auditLogRepository.findFiltered(action, actorId, targetType, targetId, pageable);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getRecentTargetAudits(Long targetId, String targetType, int limit) {
        return auditLogRepository.findTop10ByTargetIdAndTargetTypeOrderByCreatedAtDesc(targetId, targetType);
    }
}
