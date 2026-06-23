package com.ilhankazan.social.security;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistService tokenBlacklistService;
    private final AccountService accountService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {

        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenBlacklistService.isBlacklisted(jwt)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }

            if (StringUtils.hasText(jwt)) {
                Claims claims = jwtTokenProvider.validateToken(jwt);

                // A purpose-scoped MFA challenge token must never authenticate an API request.
                if ("mfa".equals(claims.get("purpose", String.class))) {
                    filterChain.doFilter(request, response);
                    return;
                }

                String username = claims.getSubject();
                Long accountId = claims.get("accountId", Long.class);

                if (accountService.isAccountBanned(accountId)) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("Your account has been suspended.");
                    return;
                }

                @SuppressWarnings("unchecked")
                List<String> roles = claims.get("roles", List.class);

                var authorities = roles != null ? roles.stream()
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList()) : List.<SimpleGrantedAuthority>of();

                CustomUserDetails principal = new CustomUserDetails(accountId, username, authorities);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    principal, null, authorities);

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
