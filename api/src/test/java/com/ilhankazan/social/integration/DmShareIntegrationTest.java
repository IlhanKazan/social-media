package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.message.ConversationResponse;
import com.ilhankazan.social.dto.message.MessageResponse;
import com.ilhankazan.social.dto.message.SharePostRequest;
import com.ilhankazan.social.dto.post.CreatePostRequest;
import com.ilhankazan.social.dto.post.PostResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DmShareIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void sharingAPostDeliversAPreviewToTheRecipient() throws Exception {
        AuthResponse sender = registerAndGetAuth("share_sender");
        AuthResponse recipient = registerAndGetAuth("share_recipient");
        HttpHeaders senderHeaders = bearer(sender.accessToken());
        HttpHeaders recipientHeaders = bearer(recipient.accessToken());

        ResponseEntity<String> convRes = restTemplate.exchange(
            "/api/v1/conversations/with/" + recipient.account().id(), HttpMethod.POST,
            new HttpEntity<>(senderHeaders), String.class);
        assertThat(convRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        Long conversationId = objectMapper.readValue(convRes.getBody(), ConversationResponse.class).id();

        Long postId = createPost(senderHeaders, "something worth sharing");

        SharePostRequest share = new SharePostRequest(postId, "you should see this");
        ResponseEntity<String> shareRes = restTemplate.exchange(
            "/api/v1/conversations/" + conversationId + "/messages/share", HttpMethod.POST,
            new HttpEntity<>(share, senderHeaders), String.class);

        assertThat(shareRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        MessageResponse shared = objectMapper.readValue(shareRes.getBody(), MessageResponse.class);
        assertThat(shared.sharedPost()).isNotNull();
        assertThat(shared.sharedPost().id()).isEqualTo(postId);
        assertThat(shared.content()).isEqualTo("you should see this");

        ResponseEntity<String> recipientView = restTemplate.exchange(
            "/api/v1/conversations/" + conversationId + "/messages", HttpMethod.GET,
            new HttpEntity<>(recipientHeaders), String.class);
        assertThat(recipientView.getBody()).contains("you should see this");
    }

    private Long createPost(HttpHeaders headers, String content) throws Exception {
        CreatePostRequest request = new CreatePostRequest(content, null, null);
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/v1/posts", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);
        assertThat(response.getStatusCode())
            .as("create post failed: %s", response.getBody())
            .isEqualTo(HttpStatus.CREATED);
        return objectMapper.readValue(response.getBody(), PostResponse.class).id();
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    private AuthResponse registerAndGetAuth(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(username, username + "@example.com", "Pass123!", username);
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", UUID.randomUUID().toString());
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/v1/auth/register", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);
        assertThat(response.getStatusCode())
            .as("register failed: %s", response.getBody())
            .isEqualTo(HttpStatus.CREATED);
        return objectMapper.readValue(response.getBody(), AuthResponse.class);
    }
}
