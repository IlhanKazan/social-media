package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.notification.NotificationPreferenceRequest;
import com.ilhankazan.social.dto.post.CreatePostRequest;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.manager.RecommendationManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RecommendationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RecommendationManager recommendationManager;

    private AuthResponse register(String username) throws Exception {
        RegisterRequest req = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", UUID.randomUUID().toString());
        ResponseEntity<String> res = restTemplate.postForEntity("/api/v1/auth/register", new HttpEntity<>(req, headers), String.class);
        if (!res.getStatusCode().is2xxSuccessful()) throw new RuntimeException("Reg failed: " + res.getBody());
        return objectMapper.readValue(res.getBody(), AuthResponse.class);
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    private PostResponse createPost(HttpHeaders authorHeaders, String content) throws Exception {
        ResponseEntity<String> res = restTemplate.exchange("/api/v1/posts", HttpMethod.POST,
            new HttpEntity<>(new CreatePostRequest(content, null, null), authorHeaders), String.class);
        return objectMapper.readValue(res.getBody(), PostResponse.class);
    }

    private void awaitClean(Long postId, HttpHeaders authed) throws Exception {
        for (int attempt = 0; attempt < 50; attempt++) {
            ResponseEntity<String> res = restTemplate.exchange("/api/v1/posts/" + postId, HttpMethod.GET, new HttpEntity<>(authed), String.class);
            if (objectMapper.readValue(res.getBody(), PostResponse.class).moderationStatus() == ModerationStatus.CLEAN) {
                return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("post did not become CLEAN in time");
    }

    // A follows liker C; C likes author D's post; A does not follow D -> A gets recommended D's post.
    private Long seedCollaborativeCandidate(AuthResponse recipient) throws Exception {
        AuthResponse liker = register("rec_liker_" + UUID.randomUUID().toString().substring(0, 8));
        AuthResponse author = register("rec_author_" + UUID.randomUUID().toString().substring(0, 8));

        restTemplate.exchange("/api/v1/follow/" + liker.account().id(), HttpMethod.POST,
            new HttpEntity<>(bearer(recipient.accessToken())), String.class);

        PostResponse post = createPost(bearer(author.accessToken()), "Beğenebileceğin bir gönderi");
        awaitClean(post.id(), bearer(author.accessToken()));

        restTemplate.exchange("/api/v1/posts/" + post.id() + "/interactions/like", HttpMethod.POST,
            new HttpEntity<>(bearer(liker.accessToken())), String.class);

        return post.id();
    }

    private JsonNode unreadContent(HttpHeaders headers) throws Exception {
        ResponseEntity<String> res = restTemplate.exchange("/api/v1/notifications?unread=true", HttpMethod.GET, new HttpEntity<>(headers), String.class);
        return objectMapper.readTree(res.getBody()).get("content");
    }

    @Test
    void shouldRecommendCollaborativePostAndNotify() throws Exception {
        AuthResponse recipient = register("rec_recipient");
        Long expectedPostId = seedCollaborativeCandidate(recipient);

        recommendationManager.recommendForUser(recipient.account().id());

        JsonNode content = unreadContent(bearer(recipient.accessToken()));
        assertThat(content).hasSize(1);
        assertThat(content.get(0).get("type").asText()).isEqualTo("RECOMMENDATION");
        assertThat(content.get(0).get("referenceId").asLong()).isEqualTo(expectedPostId);
    }

    @Test
    void shouldNotRecommendWhenRecommendationsDisabled() throws Exception {
        AuthResponse recipient = register("rec_disabled");
        seedCollaborativeCandidate(recipient);

        HttpHeaders headers = bearer(recipient.accessToken());
        NotificationPreferenceRequest disabled = new NotificationPreferenceRequest(true, true, true, true, true, false);
        ResponseEntity<String> putRes = restTemplate.exchange("/api/v1/notifications/preferences", HttpMethod.PUT,
            new HttpEntity<>(disabled, headers), String.class);
        assertThat(putRes.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(objectMapper.readTree(putRes.getBody()).get("recommendations").asBoolean()).isFalse();

        recommendationManager.recommendForUser(recipient.account().id());

        JsonNode content = unreadContent(headers);
        assertThat(content).hasSize(0);
    }
}
