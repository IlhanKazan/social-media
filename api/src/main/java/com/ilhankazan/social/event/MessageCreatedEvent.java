package com.ilhankazan.social.event;

public record MessageCreatedEvent(
    Long messageId,
    Long conversationId,
    Long senderId
) {}
