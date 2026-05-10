package com.ilhankazan.social.dto.admin;

import com.ilhankazan.social.entity.AuditLog;
import com.ilhankazan.social.entity.LoginHistory;
import java.util.List;

public record AdminUserDetailResponse(
    AdminAccountResponse profile,
    int currentSessionCount,
    List<AuditLogDto> recentAuditLogs,
    List<LoginHistoryDto> recentLogins
) {
    public record AuditLogDto(String action, String metadata, java.time.Instant createdAt) {
        public static AuditLogDto from(AuditLog log) {
            return new AuditLogDto(log.getAction(), log.getMetadata(), log.getCreatedAt());
        }
    }

    public record LoginHistoryDto(String ipAddress, String userAgent, java.time.Instant createdAt) {
        public static LoginHistoryDto from(LoginHistory history) {
            return new LoginHistoryDto(history.getIpAddress(), history.getUserAgent(), history.getCreatedAt());
        }
    }
}
