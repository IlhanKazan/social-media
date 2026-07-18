package com.ilhankazan.social.dto.notification;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import java.time.Instant;

public record NotificationResponse(
    Long id,
    PublicAccountResponse actor,
    String type,
    Long referenceId,
    int count,
    Instant readAt,
    Instant createdAt,
    Instant updatedAt
) {}
