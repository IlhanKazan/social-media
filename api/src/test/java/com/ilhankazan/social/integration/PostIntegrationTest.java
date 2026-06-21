package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.interaction.InteractionStatusResponse;
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

class PostIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    private String getAccessToken(String username) throws Exception {
        RegisterRequest registerReq = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", java.util.UUID.randomUUID().toString());
        HttpEntity<RegisterRequest> entity = new HttpEntity<>(registerReq, headers);

        ResponseEntity<String> res = restTemplate.postForEntity("/api/v1/auth/register", entity, String.class);

        if (!res.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Register failed in helper method! Body: " + res.getBody());
        }

        return objectMapper.readValue(res.getBody(), AuthResponse.class).accessToken();
    }

    @Test
    void shouldCreatePostAndInteract() throws Exception {
        String token = getAccessToken("postuser");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        CreatePostRequest postReq = new CreatePostRequest("Bu bir test gönderisidir!", null, null);
        HttpEntity<CreatePostRequest> createEntity = new HttpEntity<>(postReq, headers);

        ResponseEntity<String> createRes = restTemplate.exchange(
            "/api/v1/posts", HttpMethod.POST, createEntity, String.class);

        assertThat(createRes.getStatusCode())
            .as("Post creation failed: " + createRes.getBody())
            .isEqualTo(HttpStatus.CREATED);

        PostResponse postResponse = objectMapper.readValue(createRes.getBody(), PostResponse.class);
        assertThat(postResponse.content()).isEqualTo("Bu bir test gönderisidir!");
        assertThat(postResponse.author().username()).isEqualTo("postuser");

        Long postId = postResponse.id();

        HttpEntity<Void> emptyEntity = new HttpEntity<>(headers);
        ResponseEntity<String> likeRes = restTemplate.exchange(
            "/api/v1/posts/" + postId + "/interactions/like", HttpMethod.POST, emptyEntity, String.class);

        assertThat(likeRes.getStatusCode())
            .as("Like action failed: " + likeRes.getBody())
            .isEqualTo(HttpStatus.OK);

        InteractionStatusResponse likeStatus = objectMapper.readValue(likeRes.getBody(), InteractionStatusResponse.class);
        assertThat(likeStatus.liked()).isTrue();
        assertThat(likeStatus.likeCount()).isEqualTo(1);

        CreatePostRequest replyReq = new CreatePostRequest("Harika bir gönderi!", null, postId);
        HttpEntity<CreatePostRequest> replyEntity = new HttpEntity<>(replyReq, headers);

        ResponseEntity<String> replyRes = restTemplate.exchange(
            "/api/v1/posts", HttpMethod.POST, replyEntity, String.class);

        assertThat(replyRes.getStatusCode())
            .as("Reply action failed: " + replyRes.getBody())
            .isEqualTo(HttpStatus.CREATED);

        PostResponse replyResponse = objectMapper.readValue(replyRes.getBody(), PostResponse.class);
        assertThat(replyResponse.content()).isEqualTo("Harika bir gönderi!");
        assertThat(replyResponse.parentPostId()).isEqualTo(postId);

        ResponseEntity<String> fetchRes = restTemplate.exchange(
            "/api/v1/posts/" + postId, HttpMethod.GET, emptyEntity, String.class);

        PostResponse fetchedPost = objectMapper.readValue(fetchRes.getBody(), PostResponse.class);
        assertThat(fetchedPost.likeCount()).isEqualTo(1);
        assertThat(fetchedPost.replyCount()).isEqualTo(1);
        assertThat(fetchedPost.likedByMe()).isTrue();
    }
}
