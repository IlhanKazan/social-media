package com.ilhankazan.social.security;

import com.ilhankazan.social.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class AuthCookieFactory {

    private final AppProperties.CookieProperties cookieProps;
    private final AppProperties.JwtProperties jwtProps;

    public ResponseCookie build(String refreshToken) {
        return base(refreshToken)
            .maxAge(Duration.ofMillis(jwtProps.refreshTtlMs()))
            .build();
    }

    public ResponseCookie clear() {
        return base("")
            .maxAge(0)
            .build();
    }

    public String name() {
        return cookieProps.name();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(cookieProps.name(), value)
            .httpOnly(true)
            .secure(cookieProps.secure())
            .sameSite(cookieProps.sameSite())
            .path(cookieProps.path());
        if (StringUtils.hasText(cookieProps.domain())) {
            builder.domain(cookieProps.domain());
        }
        return builder;
    }
}
