package com.ilhankazan.social.dto.interaction;

public record UserInteractions(boolean liked, boolean disliked) {
    public static final UserInteractions EMPTY = new UserInteractions(false, false);
}