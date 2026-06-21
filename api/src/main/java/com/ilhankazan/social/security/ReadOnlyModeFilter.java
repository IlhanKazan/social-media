package com.ilhankazan.social.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.service.SystemSettingsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class ReadOnlyModeFilter extends OncePerRequestFilter {

    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final SystemSettingsService systemSettingsService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (isBlockedWrite(request)) {
            response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), Map.of(
                "status", 503,
                "error", "SERVICE_UNAVAILABLE",
                "message", "Sistem bakım modunda. Yazma işlemleri geçici olarak devre dışı."
            ));
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isBlockedWrite(HttpServletRequest request) {
        if (!WRITE_METHODS.contains(request.getMethod())) {
            return false;
        }
        String path = request.getRequestURI();
        // Auth and admin paths stay open so users can log in/out and admins can lift the mode.
        if (!path.startsWith("/api/v1/") || path.startsWith("/api/v1/auth/") || path.startsWith("/api/v1/admin/")) {
            return false;
        }
        return systemSettingsService.getBooleanSetting(SystemSettingsService.READ_ONLY_MODE, false);
    }
}
