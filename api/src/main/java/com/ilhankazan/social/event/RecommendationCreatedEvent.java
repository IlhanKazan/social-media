package com.ilhankazan.social.event;

public record RecommendationCreatedEvent(
    Long recipientId,
    Long postId,
    Long authorId
) {}
