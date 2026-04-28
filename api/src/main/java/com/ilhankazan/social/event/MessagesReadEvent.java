package com.ilhankazan.social.event;

import java.time.Instant;

public record MessagesReadEvent(
    Long conversationId,
    String otherParticipantUsername,
    Instant readAt
) {}
