package com.ilhankazan.social.event;

public record InteractionCreatedEvent(
    Long interactionId,
    Long postId,
    Long actorId,
    String type,
    String content
) {}
