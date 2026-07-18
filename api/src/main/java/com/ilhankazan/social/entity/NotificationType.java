package com.ilhankazan.social.entity;

public enum NotificationType {
    LIKE,
    COMMENT,
    FOLLOW,
    REPLY,
    MENTION,
    REPOST,
    QUOTE_REPOST,
    MODERATION_ALERT,
    RECOMMENDATION;

    public boolean isAggregatable() {
        return this == LIKE || this == REPOST;
    }
}
