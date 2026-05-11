package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.admin.AdminUserDetailResponse;
import com.ilhankazan.social.dto.admin.AdminUserDetailResponse.AuditLogDto;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.entity.AuditLog;
import com.ilhankazan.social.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AdminAuditManager {

    private final AuditLogService auditLogService;

    public void logAction(String action, String targetType, Long targetId, Map<String, Object> metadata) {
        auditLogService.record(action, targetType, targetId, metadata);
    }

    public PageResponse<AuditLogDto> getFilteredLogs(String action, Long actorId, String targetType, Long targetId, int page, int size) {
        Page<AuditLog> logs = auditLogService.getFilteredLogs(
            action, actorId, targetType, targetId,
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        return PageResponse.of(logs.map(AuditLogDto::from));
    }

    public List<AuditLogDto> getRecentTargetAuditsDto(Long targetId, String targetType, int limit) {
        return auditLogService.getRecentTargetAudits(targetId, targetType, limit)
            .stream().map(AdminUserDetailResponse.AuditLogDto::from).toList();
    }
}
