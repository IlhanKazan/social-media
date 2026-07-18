package com.ilhankazan.social.event;

import java.time.Instant;

public record FollowCreatedEvent(
    Long followerId,
    Long followingId,
    Instant followedAt
) {}
