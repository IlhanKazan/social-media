package com.ilhankazan.social.event;

public record FollowCreatedEvent(
    Long followerId,
    Long followingId
) {}
