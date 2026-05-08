package com.ilhankazan.social.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.List;
import java.util.Map;

@ConfigurationProperties(prefix = "app.moderation")
public record ModerationProperties(
    boolean enabled,
    String openaiApiKey,
    double thresholdDefault,
    Map<String, Double> thresholds,
    String blockedTermsPath
) {
    public double getThresholdForCategory(String category) {
        return thresholds != null && thresholds.containsKey(category)
            ? thresholds.get(category)
            : thresholdDefault;
    }
}
