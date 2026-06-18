package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.post.CreatePostRequest;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.entity.ModerationStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ModerationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void cleanPostIsCreatedPendingAndFlipsToClean() throws Exception {
        HttpHeaders headers = bearer(registerAndGetToken("moderation_user"));

        CreatePostRequest request = new CreatePostRequest("a perfectly ordinary post about coffee", null, null);
        ResponseEntity<String> created = restTemplate.exchange(
            "/api/v1/posts", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);
        assertThat(created.getStatusCode())
            .as("create failed: %s", created.getBody())
            .isEqualTo(HttpStatus.CREATED);

        PostResponse post = objectMapper.readValue(created.getBody(), PostResponse.class);
        assertThat(post.moderationStatus()).isEqualTo(ModerationStatus.PENDING);

        assertThat(awaitDecision(post.id(), headers)).isEqualTo(ModerationStatus.CLEAN);
    }

    private ModerationStatus awaitDecision(Long postId, HttpHeaders headers) throws Exception {
        for (int attempt = 0; attempt < 50; attempt++) {
            ResponseEntity<String> response = restTemplate.exchange(
                "/api/v1/posts/" + postId, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            ModerationStatus status = objectMapper.readValue(response.getBody(), PostResponse.class).moderationStatus();
            if (status != ModerationStatus.PENDING) {
                return status;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("moderation did not reach a decision in time");
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    private String registerAndGetToken(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(username, username + "@example.com", "Pass123!", username);
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", UUID.randomUUID().toString());
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/v1/auth/register", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);
        assertThat(response.getStatusCode())
            .as("register failed: %s", response.getBody())
            .isEqualTo(HttpStatus.CREATED);
        return objectMapper.readValue(response.getBody(), AuthResponse.class).accessToken();
    }
}
