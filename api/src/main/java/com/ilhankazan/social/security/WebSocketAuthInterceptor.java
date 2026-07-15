package com.ilhankazan.social.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistService tokenBlacklistService;
    private final AccountService accountService;

    static final String SESSION_JWT = "ws.jwt";
    static final String SESSION_ACCOUNT_ID = "ws.accountId";

    // Short TTL bounds both the revocation window and the per-frame DB cost.
    private final Cache<String, Boolean> revocationCache = Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterWrite(Duration.ofSeconds(5))
        .build();

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null) {
            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                authenticateConnection(accessor);
            } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())
                || StompCommand.SEND.equals(accessor.getCommand())) {
                verifyStillAuthorized(accessor);
            }
        }

        return message;
    }

    private void authenticateConnection(StompHeaderAccessor accessor) {
        List<String> authorization = accessor.getNativeHeader("Authorization");

        if (authorization == null || authorization.isEmpty()) {
            throw new IllegalArgumentException("Missing Authorization header in STOMP connect");
        }

        String bearerToken = authorization.getFirst();
        if (!bearerToken.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Invalid Authorization header format");
        }

        String jwt = bearerToken.substring(7);

        if (tokenBlacklistService.isBlacklisted(jwt)) {
            throw new IllegalArgumentException("Token is blacklisted");
        }

        try {
            Claims claims = jwtTokenProvider.validateToken(jwt);
            String username = claims.getSubject();
            Long accountId = claims.get("accountId", Long.class);

            if (accountService.isAccountBanned(accountId)) {
                throw new IllegalArgumentException("Account is suspended");
            }

            List<?> rawRoles = claims.get("roles", List.class);
            List<SimpleGrantedAuthority> authorities = rawRoles.stream()
                .map(role -> new SimpleGrantedAuthority(String.valueOf(role)))
                .toList();

            CustomUserDetails principal = new CustomUserDetails(accountId, username, authorities);

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal, null, authorities
            );

            accessor.setUser(authentication);

            Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
            if (sessionAttributes != null) {
                sessionAttributes.put(SESSION_JWT, jwt);
                sessionAttributes.put(SESSION_ACCOUNT_ID, accountId);
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JWT token in STOMP connect", e);
        }
    }

    private void verifyStillAuthorized(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return;
        }
        String jwt = (String) sessionAttributes.get(SESSION_JWT);
        Long accountId = (Long) sessionAttributes.get(SESSION_ACCOUNT_ID);
        if (jwt == null || accountId == null) {
            return;
        }

        boolean revoked = Boolean.TRUE.equals(revocationCache.get(jwt, key ->
            tokenBlacklistService.isBlacklisted(jwt) || accountService.isAccountBanned(accountId)));

        if (revoked) {
            throw new IllegalArgumentException("Session is no longer authorized");
        }
    }
}
