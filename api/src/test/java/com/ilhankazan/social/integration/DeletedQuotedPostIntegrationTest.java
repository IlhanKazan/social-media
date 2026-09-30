package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.post.CreatePostRequest;
import com.ilhankazan.social.dto.post.CreateQuoteRepostRequest;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.entity.ModerationStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class DeletedQuotedPostIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void feedStillLoadsAfterQuotedPostIsDeleted() throws Exception {
        HttpHeaders originalAuthor = authHeaders("quoted_author");
        HttpHeaders quoter = authHeaders("quoter_user");

        Long originalId = createPost("Silinecek orijinal gönderi", originalAuthor);
        awaitClean(originalId, originalAuthor);

        ResponseEntity<String> quoteRes = restTemplate.exchange(
            "/api/v1/posts/" + originalId + "/quote-repost", HttpMethod.POST,
            new HttpEntity<>(new CreateQuoteRepostRequest("Alıntı yorumum", null, originalId), quoter), String.class);
        assertThat(quoteRes.getStatusCode()).as(quoteRes.getBody()).isEqualTo(HttpStatus.CREATED);
        Long quoteId = objectMapper.readValue(quoteRes.getBody(), PostResponse.class).id();
        awaitClean(quoteId, quoter);

        ResponseEntity<String> deleteRes = restTemplate.exchange(
            "/api/v1/posts/" + originalId, HttpMethod.DELETE, new HttpEntity<>(originalAuthor), String.class);
        assertThat(deleteRes.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> feedRes = restTemplate.exchange(
            "/api/v1/posts/feed", HttpMethod.GET, new HttpEntity<>(quoter), String.class);
        assertThat(feedRes.getStatusCode()).as(feedRes.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(feedRes.getBody()).contains("Alıntı yorumum").doesNotContain("Silinecek orijinal gönderi");

        ResponseEntity<String> exploreRes = restTemplate.exchange(
            "/api/v1/posts/explore", HttpMethod.GET, new HttpEntity<>(quoter), String.class);
        assertThat(exploreRes.getStatusCode()).as(exploreRes.getBody()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> detailRes = restTemplate.exchange(
            "/api/v1/posts/" + quoteId, HttpMethod.GET, new HttpEntity<>(quoter), String.class);
        assertThat(detailRes.getStatusCode()).as(detailRes.getBody()).isEqualTo(HttpStatus.OK);
        PostResponse detail = objectMapper.readValue(detailRes.getBody(), PostResponse.class);
        assertThat(detail.quotedPost()).isNotNull();
        assertThat(detail.quotedPost().id()).isEqualTo(originalId);
    }

    private HttpHeaders authHeaders(String username) throws Exception {
        RegisterRequest req = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);
        HttpHeaders registerHeaders = new HttpHeaders();
        registerHeaders.add("X-Forwarded-For", java.util.UUID.randomUUID().toString());
        ResponseEntity<String> res = restTemplate.postForEntity(
            "/api/v1/auth/register", new HttpEntity<>(req, registerHeaders), String.class);
        if (!res.getStatusCode().is2xxSuccessful()) throw new RuntimeException("Reg failed: " + res.getBody());

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(objectMapper.readValue(res.getBody(), AuthResponse.class).accessToken());
        return headers;
    }

    private Long createPost(String content, HttpHeaders headers) throws Exception {
        ResponseEntity<String> res = restTemplate.exchange(
            "/api/v1/posts", HttpMethod.POST, new HttpEntity<>(new CreatePostRequest(content, null, null), headers), String.class);
        assertThat(res.getStatusCode()).as(res.getBody()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readValue(res.getBody(), PostResponse.class).id();
    }

    private void awaitClean(Long postId, HttpHeaders authorHeaders) throws Exception {
        for (int attempt = 0; attempt < 50; attempt++) {
            ResponseEntity<String> response = restTemplate.exchange(
                "/api/v1/posts/" + postId, HttpMethod.GET, new HttpEntity<>(authorHeaders), String.class);
            if (objectMapper.readValue(response.getBody(), PostResponse.class)
                    .moderationStatus() == ModerationStatus.CLEAN) {
                return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("post did not become CLEAN in time");
    }
}
