package com.ilhankazan.social.dto.interaction;

public record InteractionCounts(long likes, long dislikes, long comments) {
    public static final InteractionCounts EMPTY = new InteractionCounts(0L, 0L, 0L);
}