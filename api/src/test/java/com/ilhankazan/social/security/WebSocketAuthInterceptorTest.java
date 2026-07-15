package com.ilhankazan.social.security;

import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthInterceptorTest {

    private static final String TOKEN = "ws-access-token";

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private AccountService accountService;

    @Mock
    private Claims claims;

    @Mock
    private MessageChannel channel;

    private WebSocketAuthInterceptor interceptor;
    private Map<String, Object> sessionAttributes;

    @BeforeEach
    void setUp() {
        interceptor = new WebSocketAuthInterceptor(jwtTokenProvider, tokenBlacklistService, accountService);
        sessionAttributes = new HashMap<>();
    }

    private void connect() {
        when(tokenBlacklistService.isBlacklisted(TOKEN)).thenReturn(false);
        when(jwtTokenProvider.validateToken(TOKEN)).thenReturn(claims);
        when(claims.getSubject()).thenReturn("ws-user");
        when(claims.get("accountId", Long.class)).thenReturn(42L);
        when(claims.get("roles", List.class)).thenReturn(List.of("ROLE_USER"));
        when(accountService.isAccountBanned(42L)).thenReturn(false);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer " + TOKEN);
        accessor.setSessionAttributes(sessionAttributes);
        accessor.setLeaveMutable(true);
        interceptor.preSend(MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()), channel);
    }

    private Message<byte[]> frame(StompCommand command) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setSessionAttributes(sessionAttributes);
        if (command == StompCommand.SEND) {
            accessor.setDestination("/app/echo");
        }
        if (command == StompCommand.SUBSCRIBE) {
            accessor.setDestination("/topic/feed");
            accessor.setSubscriptionId("sub-0");
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void connectStoresSessionStateForLaterRevocationChecks() {
        connect();

        assertThat(sessionAttributes)
            .containsEntry(WebSocketAuthInterceptor.SESSION_JWT, TOKEN)
            .containsEntry(WebSocketAuthInterceptor.SESSION_ACCOUNT_ID, 42L);
    }

    @Test
    void sendPassesWhileTokenAndAccountAreStillValid() {
        connect();

        assertThatCode(() -> interceptor.preSend(frame(StompCommand.SEND), channel))
            .doesNotThrowAnyException();
    }

    @Test
    void sendIsRejectedOnceTokenIsBlacklisted() {
        connect();
        when(tokenBlacklistService.isBlacklisted(TOKEN)).thenReturn(true);

        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.SEND), channel))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("no longer authorized");
    }

    @Test
    void subscribeIsRejectedOnceAccountIsBanned() {
        connect();
        when(accountService.isAccountBanned(42L)).thenReturn(true);

        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.SUBSCRIBE), channel))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("no longer authorized");
    }

    @Test
    void revocationLookupsAreCachedBetweenFrames() {
        connect();
        clearInvocations(tokenBlacklistService, accountService);

        interceptor.preSend(frame(StompCommand.SEND), channel);
        interceptor.preSend(frame(StompCommand.SEND), channel);
        interceptor.preSend(frame(StompCommand.SUBSCRIBE), channel);

        verify(tokenBlacklistService, times(1)).isBlacklisted(TOKEN);
        verify(accountService, times(1)).isAccountBanned(42L);
    }

    @Test
    void framesWithoutSessionStatePassThrough() {
        assertThatCode(() -> interceptor.preSend(frame(StompCommand.SEND), channel))
            .doesNotThrowAnyException();
    }
}
