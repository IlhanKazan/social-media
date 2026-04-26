package com.ilhankazan.social.dto.interaction;

public record InteractionStatusResponse(
    boolean liked,
    boolean disliked,
    long likeCount,
    long dislikeCount
) {}