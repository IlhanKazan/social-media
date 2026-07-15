package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.LoginRequest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.post.CreatePostRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void loginReturns429OnceCapacityIsExceeded() {
        LoginRequest credentials = new LoginRequest("ghost-login-user", "Password123!");

        for (int attempt = 1; attempt <= 5; attempt++) {
            ResponseEntity<String> response = postLogin(credentials, null);
            assertThat(response.getStatusCode())
                .as("attempt %d should be allowed through (within capacity 5/min)", attempt)
                .isNotEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        }

        ResponseEntity<String> blocked = postLogin(credentials, null);
        assertThat(blocked.getStatusCode())
            .as("6th login within the window must be rate limited")
            .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getBody())
            .as("429 body should carry the rate-limit message")
            .containsIgnoringCase("too many requests");
    }

    @Test
    void authenticatedRequestsAreKeyedByUserNotByIp() throws Exception {
        String tokenA = registerAndGetToken("ratelimit-user-a");
        String tokenB = registerAndGetToken("ratelimit-user-b");

        assertThat(createPost(tokenA).getStatusCode())
            .as("user A first post")
            .isEqualTo(HttpStatus.CREATED);
        assertThat(createPost(tokenB).getStatusCode())
            .as("user B must not be throttled by user A sharing the same source IP")
            .isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void spoofedForwardedForCannotResetTheBucket() {
        LoginRequest credentials = new LoginRequest("ghost-xff-user", "Password123!");

        for (int attempt = 1; attempt <= 5; attempt++) {
            ResponseEntity<String> response = postLogin(credentials, "203.0.113." + attempt);
            assertThat(response.getStatusCode())
                .as("attempt %d stays within capacity regardless of the forged header", attempt)
                .isNotEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        }

        ResponseEntity<String> blocked = postLogin(credentials, "198.51.100.99");
        assertThat(blocked.getStatusCode())
            .as("rotating X-Forwarded-For must not reset the bucket; keying uses remoteAddr")
            .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    private ResponseEntity<String> postLogin(LoginRequest credentials, String forwardedFor) {
        HttpHeaders headers = new HttpHeaders();
        if (forwardedFor != null) {
            headers.add("X-Forwarded-For", forwardedFor);
        }
        return restTemplate.exchange(
            "/api/v1/auth/login", HttpMethod.POST, new HttpEntity<>(credentials, headers), String.class);
    }

    private ResponseEntity<String> createPost(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        CreatePostRequest request = new CreatePostRequest("rate-limit keying check", null, null);
        return restTemplate.exchange(
            "/api/v1/posts", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);
    }

    private String registerAndGetToken(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/v1/auth/register", HttpMethod.POST, new HttpEntity<>(request, new HttpHeaders()), String.class);
        assertThat(response.getStatusCode())
            .as("register helper failed: %s", response.getBody())
            .isEqualTo(HttpStatus.CREATED);
        return objectMapper.readValue(response.getBody(), AuthResponse.class).accessToken();
    }
}
