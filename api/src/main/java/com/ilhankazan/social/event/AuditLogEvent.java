package com.ilhankazan.social.event;

import java.util.Map;

public record AuditLogEvent(
    String username,
    String action,
    String targetType,
    Long targetId,
    Map<String, Object> metadata,
    String ipAddress,
    String userAgent
) {}
