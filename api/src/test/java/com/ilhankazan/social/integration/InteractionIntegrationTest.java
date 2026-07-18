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

class InteractionIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    private AuthResponse registerAndGetAuth(String username) throws Exception {
        RegisterRequest req = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", java.util.UUID.randomUUID().toString());
        ResponseEntity<String> res = restTemplate.postForEntity("/api/v1/auth/register", new HttpEntity<>(req, headers), String.class);
        if (!res.getStatusCode().is2xxSuccessful()) throw new RuntimeException("Reg failed: " + res.getBody());
        return objectMapper.readValue(res.getBody(), AuthResponse.class);
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    @Test
    void shouldListLikersOfAPost() throws Exception {
        AuthResponse owner = registerAndGetAuth("likers_owner");
        AuthResponse liker1 = registerAndGetAuth("likers_one");
        AuthResponse liker2 = registerAndGetAuth("likers_two");

        HttpHeaders ownerHeaders = bearer(owner.accessToken());
        ResponseEntity<String> postRes = restTemplate.exchange("/api/v1/posts", HttpMethod.POST,
            new HttpEntity<>(new CreatePostRequest("Kimler beğenmiş?", null, null), ownerHeaders), String.class);
        PostResponse post = objectMapper.readValue(postRes.getBody(), PostResponse.class);

        for (String token : new String[]{liker1.accessToken(), liker2.accessToken()}) {
            restTemplate.exchange("/api/v1/posts/" + post.id() + "/interactions/like", HttpMethod.POST,
                new HttpEntity<>(bearer(token)), String.class);
        }

        ResponseEntity<String> likersRes = restTemplate.exchange(
            "/api/v1/posts/" + post.id() + "/interactions/likers", HttpMethod.GET,
            new HttpEntity<>(ownerHeaders), String.class);

        assertThat(likersRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode content = objectMapper.readTree(likersRes.getBody()).get("content");
        assertThat(content).hasSize(2);
        assertThat(likersRes.getBody()).contains("likers_one").contains("likers_two");
    }
}
