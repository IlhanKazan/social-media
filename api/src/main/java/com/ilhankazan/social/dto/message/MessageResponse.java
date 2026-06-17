package com.ilhankazan.social.dto.message;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import java.time.Instant;

public record MessageResponse(
    Long id,
    Long conversationId,
    PublicAccountResponse sender,
    String content,
    String imageUrl,
    SharedPostPreview sharedPost,
    Instant readAt,
    Instant createdAt
) {}
