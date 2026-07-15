package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MobileAuthIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void mobileRegisterReturnsRefreshTokenInBodyAndSetsNoCookie() throws Exception {
        ResponseEntity<String> response = registerMobile("mobile-reg-user");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().get(HttpHeaders.SET_COOKIE))
            .as("mobile clients must not receive the refresh cookie")
            .isNull();

        JsonNode body = objectMapper.readTree(response.getBody());
        assertThat(body.path("refreshToken").asText())
            .as("mobile clients get the refresh token in the body")
            .isNotBlank();
        assertThat(body.path("accessToken").asText()).isNotBlank();
    }

    @Test
    void webRegisterStillSetsCookieAndStripsBodyToken() throws Exception {
        RegisterRequest request = new RegisterRequest(
            "web-reg-user", "web-reg-user@example.com", "Pass123!", "web-reg-user", true, true);
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/auth/register", new HttpEntity<>(request, new HttpHeaders()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().get(HttpHeaders.SET_COOKIE))
            .as("web keeps the HttpOnly cookie path")
            .isNotNull();
        JsonNode body = objectMapper.readTree(response.getBody());
        assertThat(body.hasNonNull("refreshToken"))
            .as("web responses must not expose the refresh token in the body")
            .isFalse();
    }

    @Test
    void mobileRefreshRotatesTokenFromBodyWithoutOriginHeader() throws Exception {
        JsonNode registered = objectMapper.readTree(registerMobile("mobile-refresh-user").getBody());
        String firstRefreshToken = registered.path("refreshToken").asText();

        ResponseEntity<String> refreshed = postMobile("/api/v1/auth/refresh",
            Map.of("refreshToken", firstRefreshToken));
        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(refreshed.getHeaders().get(HttpHeaders.SET_COOKIE)).isNull();

        JsonNode body = objectMapper.readTree(refreshed.getBody());
        String rotatedToken = body.path("refreshToken").asText();
        assertThat(rotatedToken).isNotBlank().isNotEqualTo(firstRefreshToken);
        assertThat(body.path("accessToken").asText()).isNotBlank();

        ResponseEntity<String> reused = postMobile("/api/v1/auth/refresh",
            Map.of("refreshToken", firstRefreshToken));
        assertThat(reused.getStatusCode())
            .as("rotation + reuse detection must apply to the mobile path too")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void mobileRefreshNeverFallsBackToTheCookie() throws Exception {
        JsonNode registered = objectMapper.readTree(registerMobile("mobile-cookiefall-user").getBody());
        String refreshToken = registered.path("refreshToken").asText();

        HttpHeaders headers = mobileHeaders();
        headers.add(HttpHeaders.COOKIE, "refresh_token=" + refreshToken);
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/auth/refresh", new HttpEntity<>(Map.of(), headers), String.class);

        assertThat(response.getStatusCode())
            .as("mobile path must require the body token, ignoring any ambient cookie")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void mobileLogoutRevokesTheRefreshTokenFamily() throws Exception {
        JsonNode registered = objectMapper.readTree(registerMobile("mobile-logout-user").getBody());
        String refreshToken = registered.path("refreshToken").asText();
        String accessToken = registered.path("accessToken").asText();

        HttpHeaders headers = mobileHeaders();
        headers.setBearerAuth(accessToken);
        ResponseEntity<String> logout = restTemplate.postForEntity(
            "/api/v1/auth/logout", new HttpEntity<>(Map.of("refreshToken", refreshToken), headers), String.class);
        assertThat(logout.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> afterLogout = postMobile("/api/v1/auth/refresh",
            Map.of("refreshToken", refreshToken));
        assertThat(afterLogout.getStatusCode())
            .as("a logged-out refresh token must be unusable")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private ResponseEntity<String> registerMobile(String username) {
        RegisterRequest request = new RegisterRequest(
            username, username + "@example.com", "Pass123!", username, true, true);
        return restTemplate.postForEntity(
            "/api/v1/auth/register", new HttpEntity<>(request, mobileHeaders()), String.class);
    }

    private ResponseEntity<String> postMobile(String path, Map<String, String> body) {
        return restTemplate.postForEntity(path, new HttpEntity<>(body, mobileHeaders()), String.class);
    }

    private HttpHeaders mobileHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Client-Platform", "mobile");
        return headers;
    }
}
