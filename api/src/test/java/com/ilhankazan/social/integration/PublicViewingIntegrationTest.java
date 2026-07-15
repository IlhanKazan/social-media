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
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PublicViewingIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void anonymousVisitorCanReadButNotWriteOrSeePrivateData() throws Exception {
        // Arrange: an authenticated author creates a post.
        AuthResponse author = register("public_author");
        HttpHeaders authed = new HttpHeaders();
        authed.setBearerAuth(author.accessToken());
        CreatePostRequest postReq = new CreatePostRequest("public visibility check", null, null);
        ResponseEntity<String> created = restTemplate.exchange(
            "/api/v1/posts", HttpMethod.POST, new HttpEntity<>(postReq, authed), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long postId = objectMapper.readValue(created.getBody(), PostResponse.class).id();

        // Fail-closed moderation: a post is public only once it becomes CLEAN. Wait for the
        // async decision (as the author) before asserting anonymous visibility.
        awaitClean(postId, authed);

        // Public reads: NO Authorization header -> 200, and not personalised.
        assertThat(anon("/api/v1/posts/explore?page=0&size=20").getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> post = anon("/api/v1/posts/" + postId);
        assertThat(post.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(objectMapper.readValue(post.getBody(), PostResponse.class).likedByMe()).isFalse();

        assertThat(anon("/api/v1/posts/" + postId + "/replies").getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(anon("/api/v1/posts/" + postId + "/ancestors").getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(anon("/api/v1/posts/by-user/public_author").getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> profile = anon("/api/v1/accounts/public_author");
        assertThat(profile.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(profile.getBody()).contains("public_author");

        assertThat(anon("/api/v1/search/posts?q=visibility").getStatusCode()).isEqualTo(HttpStatus.OK);

        // Private/owner reads stay closed to anonymous.
        assertThat(anon("/api/v1/posts/feed").getStatusCode()).matches(this::isUnauthorizedOrForbidden);
        assertThat(anon("/api/v1/conversations").getStatusCode()).matches(this::isUnauthorizedOrForbidden);
        assertThat(anon("/api/v1/accounts/me").getStatusCode()).matches(this::isUnauthorizedOrForbidden);

        // Writes stay closed to anonymous.
        CreatePostRequest anonPost = new CreatePostRequest("should be rejected", null, null);
        ResponseEntity<String> anonWrite = restTemplate.exchange(
            "/api/v1/posts", HttpMethod.POST, new HttpEntity<>(anonPost), String.class);
        assertThat(anonWrite.getStatusCode()).matches(this::isUnauthorizedOrForbidden);
    }

    private void awaitClean(Long postId, HttpHeaders authed) throws Exception {
        for (int attempt = 0; attempt < 50; attempt++) {
            ResponseEntity<String> response = restTemplate.exchange(
                "/api/v1/posts/" + postId, HttpMethod.GET, new HttpEntity<>(authed), String.class);
            if (objectMapper.readValue(response.getBody(), PostResponse.class)
                    .moderationStatus() == ModerationStatus.CLEAN) {
                return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("post did not become CLEAN in time");
    }

    private boolean isUnauthorizedOrForbidden(HttpStatusCode status) {
        return status.value() == 401 || status.value() == 403;
    }

    private ResponseEntity<String> anon(String path) {
        return restTemplate.getForEntity(path, String.class);
    }

    private AuthResponse register(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);
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
