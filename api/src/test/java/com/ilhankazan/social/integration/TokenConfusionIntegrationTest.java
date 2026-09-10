package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Every token this app mints is signed with the same key, so a valid signature alone must never
 * be enough to authenticate a request. Before the `typ` claim, a refresh token worked as a bearer
 * token — which also meant logout, logout-all, password reset and reuse detection all revoked it
 * in the database while it kept working on the request path for its full 30-day lifetime.
 */
class TokenConfusionIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void refreshTokenIsRejectedAsABearerToken() throws Exception {
        JsonNode registered = register("confusion-read-user");
        String refreshToken = registered.path("refreshToken").asText();
        String accessToken = registered.path("accessToken").asText();

        assertThat(refreshToken).isNotBlank();
        assertThat(getMe(accessToken).getStatusCode())
            .as("the real access token still works")
            .isEqualTo(HttpStatus.OK);

        assertThat(getMe(refreshToken).getStatusCode())
            .as("a refresh token must not read the owner's account")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refreshTokenCannotWriteAsItsSubject() throws Exception {
        String refreshToken = register("confusion-write-user").path("refreshToken").asText();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(refreshToken);
        ResponseEntity<String> created = restTemplate.postForEntity(
            "/api/v1/posts", new HttpEntity<>(Map.of("content", "written with a refresh token"), headers), String.class);

        assertThat(created.getStatusCode())
            .as("a refresh token must not post as its subject")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void revokedRefreshTokenIsRejectedOnBothPaths() throws Exception {
        JsonNode registered = register("confusion-revoked-user");
        String refreshToken = registered.path("refreshToken").asText();
        String accessToken = registered.path("accessToken").asText();

        HttpHeaders logoutHeaders = mobileHeaders();
        logoutHeaders.setBearerAuth(accessToken);
        assertThat(restTemplate.postForEntity(
            "/api/v1/auth/logout", new HttpEntity<>(Map.of("refreshToken", refreshToken), logoutHeaders), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(restTemplate.postForEntity(
            "/api/v1/auth/refresh", new HttpEntity<>(Map.of("refreshToken", refreshToken), mobileHeaders()), String.class)
            .getStatusCode())
            .as("rotation revokes the family")
            .isEqualTo(HttpStatus.UNAUTHORIZED);

        assertThat(getMe(refreshToken).getStatusCode())
            .as("and the revoked token must not survive as a bearer credential either")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private ResponseEntity<String> getMe(String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(bearerToken);
        return restTemplate.exchange("/api/v1/accounts/me", HttpMethod.GET, new HttpEntity<>(headers), String.class);
    }

    private JsonNode register(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(
            username, username + "@example.com", "Pass123!", username, true, true);
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/auth/register", new HttpEntity<>(request, mobileHeaders()), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readTree(response.getBody());
    }

    private HttpHeaders mobileHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Client-Platform", "mobile");
        return headers;
    }
}
