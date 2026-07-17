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

    @ConfigurationProperties(prefix = "app.auth.cookie")
    public record CookieProperties(
            String name,
            String path,
            String sameSite,
            boolean secure,
            String domain
    ) {}

    @ConfigurationProperties(prefix = "app.cloudinary")
    public record CloudinaryProperties(
            String cloudName,
            String apiKey,
            String apiSecret
    ) {}

    @ConfigurationProperties(prefix = "app.email")
    public record EmailProperties(
        boolean enabled,
        String provider,
        String fromAddress,
        String fromName,
        String resendApiKey,
        int dailyCap,
        int monthlyCap,
        String appName,
        String logoUrl
    ) {}

    @ConfigurationProperties(prefix = "app.firebase")
    public record FirebaseProperties(
        boolean enabled,
        String credentialsPath
    ) {}
}
