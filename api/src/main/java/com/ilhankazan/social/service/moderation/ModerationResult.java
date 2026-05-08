package com.ilhankazan.social.service.moderation;

import java.util.Map;

public record ModerationResult(
    boolean flagged,
    Map<String, Double> categoryScores,
    String provider
) {}
