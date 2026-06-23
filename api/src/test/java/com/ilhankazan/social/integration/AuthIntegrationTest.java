package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.LoginRequest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class AuthIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldRegisterAndLoginSuccessfully() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
            "testuser",
            "testuser@example.com",
            "Password123!",
            "Test User",
            true,
            true
        );

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", java.util.UUID.randomUUID().toString());
        HttpEntity<RegisterRequest> entity = new HttpEntity<>(registerRequest, headers);

        ResponseEntity<String> registerResponse = restTemplate.postForEntity(
            "/api/v1/auth/register",
            entity,
            String.class
        );

        assertThat(registerResponse.getStatusCode())
            .as("Register failed! Body: " + registerResponse.getBody())
            .isEqualTo(HttpStatus.CREATED);

        AuthResponse regAuth = objectMapper.readValue(registerResponse.getBody(), AuthResponse.class);
        assertThat(regAuth.accessToken()).isNotBlank();
        assertThat(regAuth.refreshToken()).as("refresh token must not leak in the body").isNull();

        String registerSetCookie = registerResponse.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(registerSetCookie)
            .as("refresh token must be set as an HttpOnly cookie")
            .isNotNull()
            .contains("refresh_token=")
            .contains("HttpOnly");
        String registerRefresh = extractRefreshCookieValue(registerSetCookie);
        assertThat(registerRefresh).isNotBlank();

        LoginRequest loginRequest = new LoginRequest(
            "testuser",
            "Password123!"
        );

        ResponseEntity<String> loginResponse = restTemplate.postForEntity(
            "/api/v1/auth/login",
            loginRequest,
            String.class
        );

        assertThat(loginResponse.getStatusCode())
            .as("Login failed! Body: " + loginResponse.getBody())
            .isEqualTo(HttpStatus.OK);

        var loginBody = objectMapper.readTree(loginResponse.getBody());
        assertThat(loginBody.get("status").asText()).isEqualTo("AUTHENTICATED");
        assertThat(loginBody.get("accessToken").asText()).isNotBlank();
        assertThat(loginBody.has("refreshToken")).as("refresh token must not leak in the body").isFalse();

        String loginRefresh = extractRefreshCookieValue(loginResponse.getHeaders().getFirst(HttpHeaders.SET_COOKIE));
        assertThat(loginRefresh).isNotBlank().isNotEqualTo(registerRefresh);
    }

    @Test
    void shouldRejectRegistrationWithoutConsent() {
        RegisterRequest noConsent = new RegisterRequest(
            "noconsent",
            "noconsent@example.com",
            "Password123!",
            "No Consent",
            false,
            true
        );

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", java.util.UUID.randomUUID().toString());

        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/auth/register",
            new HttpEntity<>(noConsent, headers),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private String extractRefreshCookieValue(String setCookieHeader) {
        assertThat(setCookieHeader).isNotNull();
        String firstAttribute = setCookieHeader.split(";", 2)[0];
        return firstAttribute.substring(firstAttribute.indexOf('=') + 1);
    }
}
