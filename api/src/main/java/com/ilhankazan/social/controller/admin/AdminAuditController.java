package com.ilhankazan.social.controller.admin;

import com.ilhankazan.social.dto.admin.AdminUserDetailResponse.AuditLogDto;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.manager.AdminAuditManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit-log")
@RequiredArgsConstructor
public class AdminAuditController {

    private final AdminAuditManager adminAuditManager;

    @GetMapping
    public ResponseEntity<PageResponse<AuditLogDto>> getAuditLogs(
        @RequestParam(required = false) String action,
        @RequestParam(required = false) Long actorId,
        @RequestParam(required = false) String targetType,
        @RequestParam(required = false) Long targetId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size) {

        return ResponseEntity.ok(
            adminAuditManager.getFilteredLogs(action, actorId, targetType, targetId, page, size)
        );
    }
}
