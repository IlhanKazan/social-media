package com.ilhankazan.social.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;

@Component
@RequiredArgsConstructor
@Slf4j
public class EnvironmentSanityCheck implements ApplicationListener<ApplicationStartedEvent> {

    private static final String DEV_JWT_SECRET = "dev-secret-must-be-at-least-32-bytes-long-please-change";
    private static final String DEV_METRICS_PASSWORD = "dev-metrics-password-change-me";
    private static final int MIN_METRICS_PASSWORD_LENGTH = 32;

    private final Environment env;
    private final AppProperties.JwtProperties jwtProps;
    private final AppProperties.CloudinaryProperties cloudinaryProps;
    private final AppProperties.EmailProperties emailProps;
    private final AppProperties.FirebaseProperties firebaseProps;
    private final AppProperties.MetricsProperties metricsProps;

    @Override
    public void onApplicationEvent(ApplicationStartedEvent event) {
        if (!Arrays.asList(env.getActiveProfiles()).contains("prod")) {
            return;
        }

        boolean failed = false;

        if (jwtProps.secret() == null || jwtProps.secret().length() < 32 ||
            DEV_JWT_SECRET.equals(jwtProps.secret())) {
            log.error("FATAL: Weak or default JWT_SECRET in prod profile. Must be >= 32 bytes.");
            failed = true;
        }

        if (!StringUtils.hasText(cloudinaryProps.apiSecret())) {
            log.error("FATAL: Missing CLOUDINARY_API_SECRET in prod profile.");
            failed = true;
        }

        if (emailProps.enabled() && !StringUtils.hasText(emailProps.resendApiKey())) {
            log.error("FATAL: EMAIL_ENABLED=true but RESEND_API_KEY is missing in prod profile.");
            failed = true;
        }

        if (firebaseProps.enabled() && !StringUtils.hasText(firebaseProps.credentialsPath())) {
            log.error("FATAL: FIREBASE_ENABLED=true but FIREBASE_CREDENTIALS_PATH is missing in prod profile.");
            failed = true;
        }

        String openAiKey = env.getProperty("app.moderation.openai-api-key", "");
        boolean moderationEnabled = Boolean.parseBoolean(env.getProperty("app.moderation.enabled", "true"));
        if (moderationEnabled && !StringUtils.hasText(openAiKey)) {
            log.error("FATAL: MODERATION_ENABLED=true but OPENAI_API_KEY is missing in prod profile.");
            failed = true;
        }

        // Length is load-bearing: the scraper credential is compared with a fast
        // constant-time hash rather than BCrypt (see SecurityConfig), so entropy,
        // not a work factor, is what makes brute-force infeasible.
        if (!StringUtils.hasText(metricsProps.password()) ||
            DEV_METRICS_PASSWORD.equals(metricsProps.password()) ||
            metricsProps.password().length() < MIN_METRICS_PASSWORD_LENGTH) {
            log.error("FATAL: Missing, default, or too-short METRICS_PASSWORD in prod profile (min {} chars). /actuator/prometheus would be scrapeable with a guessable credential.",
                MIN_METRICS_PASSWORD_LENGTH);
            failed = true;
        }

        if (failed) {
            System.exit(1);
        }
    }
}
