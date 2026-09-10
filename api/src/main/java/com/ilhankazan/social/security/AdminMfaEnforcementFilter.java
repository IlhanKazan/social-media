package com.ilhankazan.social.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.service.AccountService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * The most privileged account must not rest on one factor.
 *
 * Only applies to callers that already hold ROLE_ADMIN, so /actuator/health stays anonymous and
 * ordinary users are unaffected. /actuator/prometheus lives on its own filter chain and never
 * reaches this. An admin without a second factor can still reach /api/v1/accounts/me/mfa/**, which
 * is where they turn one on — so this locks the panel, not the account.
 */
@Component
@RequiredArgsConstructor
public class AdminMfaEnforcementFilter extends OncePerRequestFilter {

    private final AccountService accountService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {

        if (isGuardedPath(request) && isAdmin() && !hasSecondFactor()) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), Map.of(
                "code", "ADMIN_MFA_REQUIRED",
                "message", "Yönetici işlemleri için iki adımlı doğrulamayı açman gerekiyor."
            ));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isGuardedPath(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/v1/admin/") || path.startsWith("/actuator/");
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        return auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch("ROLE_ADMIN"::equals);
    }

    private boolean hasSecondFactor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth.getPrincipal() instanceof CustomUserDetails principal) || principal.getId() == null) {
            return false;
        }
        return accountService.getAccountById(principal.getId()).isMfaEnabled();
    }
}
