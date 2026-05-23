package com.ilhankazan.social.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.bot")
public record BotProperties(
    boolean enabled,
    String geminiApiKey,
    String geminiModel,
    int cadenceSeconds,
    int dailyQuota,
    int accountCount
) {}
