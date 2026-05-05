package com.ilhankazan.social.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;

@Component
@RequiredArgsConstructor
@Slf4j
public class EnvironmentSanityCheck implements ApplicationListener<ApplicationReadyEvent> {

    private final Environment env;
    private final AppProperties.JwtProperties jwtProps;
    private final AppProperties.CloudinaryProperties cloudinaryProps;

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        if (Arrays.asList(env.getActiveProfiles()).contains("prod")) {
            boolean failed = false;

            if (jwtProps.secret() == null || jwtProps.secret().length() < 32 ||
                "dev-secret-must-be-at-least-32-bytes-long-please-change".equals(jwtProps.secret())) {
                log.error("FATAL: Weak or default JWT_SECRET in prod profile. Must be >= 32 bytes.");
                failed = true;
            }

            if (!StringUtils.hasText(cloudinaryProps.apiSecret())) {
                log.error("FATAL: Missing Cloudinary API Secret in prod profile.");
                failed = true;
            }

            if (failed) {
                System.exit(1);
            }
        }
    }
}
