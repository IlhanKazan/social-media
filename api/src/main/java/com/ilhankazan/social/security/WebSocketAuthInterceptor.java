package com.ilhankazan.social.security;

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

import java.util.List;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistService tokenBlacklistService;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticateConnection(accessor);
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

            List<?> rawRoles = claims.get("roles", List.class);
            List<SimpleGrantedAuthority> authorities = rawRoles.stream()
                .map(role -> new SimpleGrantedAuthority(String.valueOf(role)))
                .toList();

            CustomUserDetails principal = new CustomUserDetails(accountId, username, authorities);

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal, null, authorities
            );

            accessor.setUser(authentication);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JWT token in STOMP connect", e);
        }
    }
}
