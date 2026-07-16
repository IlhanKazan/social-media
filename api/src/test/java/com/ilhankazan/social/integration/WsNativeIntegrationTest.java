package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WsNativeIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void connectWithoutAuthorizationIsRejected() {
        WebSocketStompClient client = stompClient();

        assertThatThrownBy(() -> client.connectAsync(
                wsUrl(), new WebSocketHttpHeaders(), new StompHeaders(), new StompSessionHandlerAdapter() {})
            .get(5, TimeUnit.SECONDS))
            .as("a CONNECT frame without a Bearer token must be rejected")
            .isNotNull();
    }

    @Test
    void nativeClientReceivesFeedBroadcastOnceModerationClearsThePost() throws Exception {
        String accessToken = registerAndGetAccessToken("ws-native-user");

        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + accessToken);
        StompSession session = stompClient().connectAsync(
                wsUrl(), new WebSocketHttpHeaders(), connectHeaders, new StompSessionHandlerAdapter() {})
            .get(5, TimeUnit.SECONDS);
        CompletableFuture<String> received = new CompletableFuture<>();
        session.subscribe("/topic/feed", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                received.complete(new String((byte[]) payload, StandardCharsets.UTF_8));
            }
        });
        // The simple broker does not ack SUBSCRIBE; registration is in-process, give it a moment.
        Thread.sleep(1000);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        ResponseEntity<String> created = restTemplate.postForEntity(
            "/api/v1/posts",
            new HttpEntity<>(Map.of("content", "hello from the native websocket"), headers),
            String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        JsonNode broadcast = objectMapper.readTree(received.get(15, TimeUnit.SECONDS));
        assertThat(broadcast.path("content").asText()).isEqualTo("hello from the native websocket");

        session.disconnect();
    }

    private WebSocketStompClient stompClient() {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setDefaultHeartbeat(new long[]{0, 0});
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.afterPropertiesSet();
        client.setTaskScheduler(scheduler);
        return client;
    }

    private String wsUrl() {
        return "ws://localhost:" + port + "/ws-native";
    }

    private String registerAndGetAccessToken(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(
            username, username + "@example.com", "Pass123!", username, true, true);
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/auth/register", new HttpEntity<>(request, new HttpHeaders()), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readTree(response.getBody()).path("accessToken").asText();
    }
}
