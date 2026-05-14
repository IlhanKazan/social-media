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

    private final Environment env;
    private final AppProperties.JwtProperties jwtProps;
    private final AppProperties.CloudinaryProperties cloudinaryProps;
    private final AppProperties.EmailProperties emailProps;

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

        String openAiKey = env.getProperty("app.moderation.openai-api-key", "");
        boolean moderationEnabled = Boolean.parseBoolean(env.getProperty("app.moderation.enabled", "true"));
        if (moderationEnabled && !StringUtils.hasText(openAiKey)) {
            log.error("FATAL: MODERATION_ENABLED=true but OPENAI_API_KEY is missing in prod profile.");
            failed = true;
        }

        if (failed) {
            System.exit(1);
        }
    }
}
