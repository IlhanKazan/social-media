package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
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

class FollowIntegrationTest extends BaseIntegrationTest {

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
    void shouldFollowUserAndSeePostsInFeed() throws Exception {
        AuthResponse followerAuth = registerAndGetAuth("follower_user");
        AuthResponse targetAuth = registerAndGetAuth("target_user");

        HttpHeaders followerHeaders = new HttpHeaders();
        followerHeaders.setBearerAuth(followerAuth.accessToken());

        HttpHeaders targetHeaders = new HttpHeaders();
        targetHeaders.setBearerAuth(targetAuth.accessToken());

        CreatePostRequest postReq = new CreatePostRequest("Target user'dan selamlar!", null, null);
        ResponseEntity<String> postRes = restTemplate.exchange("/api/v1/posts", HttpMethod.POST, new HttpEntity<>(postReq, targetHeaders), String.class);
        assertThat(postRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<String> emptyFeedRes = restTemplate.exchange("/api/v1/posts/feed", HttpMethod.GET, new HttpEntity<>(followerHeaders), String.class);
        assertThat(emptyFeedRes.getBody()).doesNotContain("Target user'dan selamlar!");

        ResponseEntity<String> followRes = restTemplate.exchange("/api/v1/follow/" + targetAuth.account().id(), HttpMethod.POST, new HttpEntity<>(followerHeaders), String.class);
        assertThat(followRes.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> filledFeedRes = restTemplate.exchange("/api/v1/posts/feed", HttpMethod.GET, new HttpEntity<>(followerHeaders), String.class);
        assertThat(filledFeedRes.getBody()).contains("Target user'dan selamlar!");
    }
}
