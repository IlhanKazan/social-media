package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.post.CreatePostRequest;
import com.ilhankazan.social.dto.post.PostResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    private AuthResponse registerAndGetAuth(String username) throws Exception {
        RegisterRequest req = new RegisterRequest(username, username + "@example.com", "Pass123!", username);

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", java.util.UUID.randomUUID().toString());
        HttpEntity<RegisterRequest> entity = new HttpEntity<>(req, headers);

        ResponseEntity<String> res = restTemplate.postForEntity("/api/v1/auth/register", entity, String.class);
        if (!res.getStatusCode().is2xxSuccessful()) throw new RuntimeException("Reg failed: " + res.getBody());
        return objectMapper.readValue(res.getBody(), AuthResponse.class);
    }

    @Test
    void shouldCreateNotificationOnLike() throws Exception {
        AuthResponse likerAuth = registerAndGetAuth("liker_user");
        AuthResponse ownerAuth = registerAndGetAuth("owner_user");

        HttpHeaders likerHeaders = new HttpHeaders();
        likerHeaders.setBearerAuth(likerAuth.accessToken());

        HttpHeaders ownerHeaders = new HttpHeaders();
        ownerHeaders.setBearerAuth(ownerAuth.accessToken());

        CreatePostRequest postReq = new CreatePostRequest("Bu post çok like alacak!", null, null);
        ResponseEntity<String> postRes = restTemplate.exchange("/api/v1/posts", HttpMethod.POST, new HttpEntity<>(postReq, ownerHeaders), String.class);
        PostResponse postResponse = objectMapper.readValue(postRes.getBody(), PostResponse.class);

        ResponseEntity<String> likeRes = restTemplate.exchange("/api/v1/posts/" + postResponse.id() + "/interactions/like", HttpMethod.POST, new HttpEntity<>(likerHeaders), String.class);
        assertThat(likeRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> notifRes = restTemplate.exchange("/api/v1/notifications?unread=true", HttpMethod.GET, new HttpEntity<>(ownerHeaders), String.class);

        assertThat(notifRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(notifRes.getBody()).contains("liker_user");
        assertThat(notifRes.getBody()).contains("LIKE");

        ResponseEntity<Integer> countRes = restTemplate.exchange("/api/v1/notifications/unread-count", HttpMethod.GET, new HttpEntity<>(ownerHeaders), Integer.class);
        assertThat(countRes.getBody()).isEqualTo(1);
    }
}
