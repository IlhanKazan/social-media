package com.ilhankazan.social.event;

public record UserBannedEvent(
    Long accountId,
    String username,
    String reason
) {}
