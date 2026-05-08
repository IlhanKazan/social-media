package com.ilhankazan.social.event;

import com.ilhankazan.social.entity.ModerationStatus;

public record PostModerationDecidedEvent(
    Long postId,
    String authorUsername,
    ModerationStatus status
) {}
