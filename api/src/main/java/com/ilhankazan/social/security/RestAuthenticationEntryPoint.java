package com.ilhankazan.social.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.exception.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

/**
 * Answers an unauthenticated request with 401 instead of Spring Security's default 403.
 *
 * The distinction is load-bearing here, not cosmetic: both API clients retry only on 401
 * (`client/src/lib/api.ts`, `mobile/src/lib/api.ts`), so while an expired access token produced
 * 403 their refresh-and-retry branch could never run, and only the proactive keep-alive timer
 * kept sessions from dying. A caller that *is* authenticated but lacks the role still gets 403
 * from the access-denied handler, which is what ExceptionTranslationFilter routes separately.
 */
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");

        objectMapper.writeValue(response.getOutputStream(), new ErrorResponse(
            "UNAUTHORIZED",
            "Invalid credentials or unauthorized access",
            Instant.now(),
            request.getRequestURI(),
            null
        ));
    }
}
