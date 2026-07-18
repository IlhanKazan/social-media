package com.ilhankazan.social.dto.notification;

public record NotificationPreferenceResponse(
    boolean likes,
    boolean reposts,
    boolean follows,
    boolean replies,
    boolean mentions,
    boolean recommendations
) {}
