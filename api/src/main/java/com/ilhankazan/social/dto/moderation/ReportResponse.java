package com.ilhankazan.social.dto.moderation;

import java.time.Instant;

public record ReportResponse(
    Long id,
    Long postId,
    String reason,
    String details,
    Instant createdAt,
    Instant resolvedAt,
    String resolution
) {}
