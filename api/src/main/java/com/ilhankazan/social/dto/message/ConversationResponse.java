package com.ilhankazan.social.dto.message;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import java.time.Instant;

public record ConversationResponse(
    Long id,
    PublicAccountResponse otherParticipant,
    Instant lastMessageAt,
    int unreadCount
) {}
