package com.ilhankazan.social.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.List;

public class AppProperties {

    @ConfigurationProperties(prefix = "app.jwt")
    public record JwtProperties(
            String secret,
            long accessTtlMs,
            long refreshTtlMs
    ) {}

    @ConfigurationProperties(prefix = "app.cors")
    public record CorsProperties(
            List<String> allowedOrigins
    ) {}

    @ConfigurationProperties(prefix = "app.cloudinary")
    public record CloudinaryProperties(
            String cloudName,
            String apiKey,
            String apiSecret
    ) {}
}
