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
            "Test User"
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
        assertThat(regAuth.refreshToken()).isNotBlank();


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

        AuthResponse loginAuth = objectMapper.readValue(loginResponse.getBody(), AuthResponse.class);
        assertThat(loginAuth.accessToken()).isNotBlank();

        assertThat(loginAuth.refreshToken()).isNotEqualTo(regAuth.refreshToken());
    }
}
