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

class ModerationFailClosedIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    // "siktir" is in the production regex block list, so this post is deterministically FLAGGED.
    private static final String BANNED = "siktir git buradan";

    @Test
    void flaggedPostIsNeverVisibleToOthersButStaysVisibleToAuthor() throws Exception {
        HttpHeaders author = bearer(registerToken("ff_author"));
        HttpHeaders other = bearer(registerToken("ff_other"));

        CreatePostRequest request = new CreatePostRequest(BANNED, null, null);
        ResponseEntity<String> created = restTemplate.exchange(
            "/api/v1/posts", HttpMethod.POST, new HttpEntity<>(request, author), String.class);
        assertThat(created.getStatusCode())
            .as("create failed: %s", created.getBody())
            .isEqualTo(HttpStatus.CREATED);
        Long postId = objectMapper.readValue(created.getBody(), PostResponse.class).id();

        assertThat(awaitDecision(postId, author)).isEqualTo(ModerationStatus.FLAGGED);

        // The flagged post is queue-eligible (FLAGGED + admin ACTIVE) and never auto-cleaned.
        String status = jdbcTemplate.queryForObject(
            "SELECT moderation_status FROM posts WHERE id = ?", String.class, postId);
        String adminStatus = jdbcTemplate.queryForObject(
            "SELECT admin_status FROM posts WHERE id = ?", String.class, postId);
        assertThat(status).isEqualTo("FLAGGED");
        assertThat(adminStatus).isEqualTo("ACTIVE");

        // Author still sees their own held post.
        assertThat(get("/api/v1/posts/" + postId, author).getStatusCode()).isEqualTo(HttpStatus.OK);

        // Everyone else: single-post read is 404, and it appears in no public list.
        assertThat(get("/api/v1/posts/" + postId, other).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(get("/api/v1/posts/" + postId, null).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(get("/api/v1/search/posts?q=buradan", other).getBody()).doesNotContain("buradan");
        assertThat(get("/api/v1/posts/explore?page=0&size=20", other).getBody()).doesNotContain("buradan");

        // Author's own profile shows it; another viewer's view of that profile does not.
        assertThat(get("/api/v1/posts/by-user/ff_author", author).getBody()).contains("buradan");
        assertThat(get("/api/v1/posts/by-user/ff_author", other).getBody()).doesNotContain("buradan");
    }

    private ModerationStatus awaitDecision(Long postId, HttpHeaders author) throws Exception {
        for (int attempt = 0; attempt < 50; attempt++) {
            ResponseEntity<String> response = get("/api/v1/posts/" + postId, author);
            ModerationStatus status = objectMapper.readValue(response.getBody(), PostResponse.class).moderationStatus();
            if (status != ModerationStatus.PENDING) return status;
            Thread.sleep(100);
        }
        throw new AssertionError("moderation did not reach a decision in time");
    }

    private ResponseEntity<String> get(String path, HttpHeaders headers) {
        return restTemplate.exchange(path, HttpMethod.GET,
            headers == null ? HttpEntity.EMPTY : new HttpEntity<>(headers), String.class);
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    private String registerToken(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);
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
