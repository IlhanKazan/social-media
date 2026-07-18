package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.JsonNode;
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
        RegisterRequest req = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);

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

    @Test
    void shouldCoalesceMultipleLikesIntoOneNotification() throws Exception {
        AuthResponse ownerAuth = registerAndGetAuth("coal_owner");
        AuthResponse liker1Auth = registerAndGetAuth("coal_liker1");
        AuthResponse liker2Auth = registerAndGetAuth("coal_liker2");

        HttpHeaders ownerHeaders = new HttpHeaders();
        ownerHeaders.setBearerAuth(ownerAuth.accessToken());

        CreatePostRequest postReq = new CreatePostRequest("Coalesce edilecek post", null, null);
        ResponseEntity<String> postRes = restTemplate.exchange("/api/v1/posts", HttpMethod.POST, new HttpEntity<>(postReq, ownerHeaders), String.class);
        PostResponse post = objectMapper.readValue(postRes.getBody(), PostResponse.class);

        for (String token : new String[]{liker1Auth.accessToken(), liker2Auth.accessToken()}) {
            HttpHeaders likerHeaders = new HttpHeaders();
            likerHeaders.setBearerAuth(token);
            restTemplate.exchange("/api/v1/posts/" + post.id() + "/interactions/like", HttpMethod.POST, new HttpEntity<>(likerHeaders), String.class);
        }

        ResponseEntity<String> notifRes = restTemplate.exchange("/api/v1/notifications?unread=true", HttpMethod.GET, new HttpEntity<>(ownerHeaders), String.class);
        JsonNode content = objectMapper.readTree(notifRes.getBody()).get("content");

        assertThat(content).hasSize(1);
        assertThat(content.get(0).get("type").asText()).isEqualTo("LIKE");
        assertThat(content.get(0).get("count").asInt()).isEqualTo(2);
        assertThat(content.get(0).get("actor").get("username").asText()).isEqualTo("coal_liker2");

        ResponseEntity<Integer> countRes = restTemplate.exchange("/api/v1/notifications/unread-count", HttpMethod.GET, new HttpEntity<>(ownerHeaders), Integer.class);
        assertThat(countRes.getBody()).isEqualTo(1);
    }

    @Test
    void shouldNotInflateCountWhenSameUserTogglesLike() throws Exception {
        AuthResponse ownerAuth = registerAndGetAuth("toggle_owner");
        AuthResponse likerAuth = registerAndGetAuth("toggle_liker");

        HttpHeaders ownerHeaders = new HttpHeaders();
        ownerHeaders.setBearerAuth(ownerAuth.accessToken());
        HttpHeaders likerHeaders = new HttpHeaders();
        likerHeaders.setBearerAuth(likerAuth.accessToken());

        CreatePostRequest postReq = new CreatePostRequest("Toggle testi", null, null);
        ResponseEntity<String> postRes = restTemplate.exchange("/api/v1/posts", HttpMethod.POST, new HttpEntity<>(postReq, ownerHeaders), String.class);
        PostResponse post = objectMapper.readValue(postRes.getBody(), PostResponse.class);

        // like -> unlike -> like: two "like created" events, one active like at the end
        for (int i = 0; i < 3; i++) {
            restTemplate.exchange("/api/v1/posts/" + post.id() + "/interactions/like", HttpMethod.POST, new HttpEntity<>(likerHeaders), String.class);
        }

        ResponseEntity<String> notifRes = restTemplate.exchange("/api/v1/notifications?unread=true", HttpMethod.GET, new HttpEntity<>(ownerHeaders), String.class);
        JsonNode content = objectMapper.readTree(notifRes.getBody()).get("content");

        assertThat(content).hasSize(1);
        assertThat(content.get(0).get("type").asText()).isEqualTo("LIKE");
        assertThat(content.get(0).get("count").asInt()).isEqualTo(1);

        ResponseEntity<Integer> countRes = restTemplate.exchange("/api/v1/notifications/unread-count", HttpMethod.GET, new HttpEntity<>(ownerHeaders), Integer.class);
        assertThat(countRes.getBody()).isEqualTo(1);
    }
}
