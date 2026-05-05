package com.ilhankazan.social.config;

import com.resend.Resend;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class ResendConfig {

    private final AppProperties.EmailProperties emailProps;

    @Bean
    @ConditionalOnProperty(prefix = "app.email", name = "enabled", havingValue = "true")
    public Resend resend() {
        return new Resend(emailProps.resendApiKey());
    }
}
