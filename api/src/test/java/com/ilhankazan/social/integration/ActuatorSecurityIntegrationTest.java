package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ActuatorSecurityIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void healthIsPublicButDiagnosticsAreNotReachableByNonAdmins() throws Exception {
        // Health stays public for Render probes + the keepalive cron.
        assertThat(restTemplate.getForEntity("/actuator/health", String.class).getStatusCode())
            .isEqualTo(HttpStatus.OK);

        // Anonymous cannot read diagnostics (stateless JWT denies with 401 or 403).
        assertThat(restTemplate.getForEntity("/actuator/metrics", String.class).getStatusCode().value())
            .isIn(401, 403);

        // A regular logged-in user is forbidden — only ROLE_ADMIN passes.
        AuthResponse user = register("plainuser");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(user.accessToken());
        assertThat(restTemplate.exchange("/actuator/metrics", HttpMethod.GET, new HttpEntity<>(headers), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private AuthResponse register(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", UUID.randomUUID().toString());
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/v1/auth/register", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readValue(response.getBody(), AuthResponse.class);
    }
}
