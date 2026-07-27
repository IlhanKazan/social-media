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

    @Test
    void prometheusRequiresScraperCredentialsAndIsNotOpenedToJwtUsers() throws Exception {
        // Anonymous scrape is rejected.
        assertThat(restTemplate.getForEntity("/actuator/prometheus", String.class).getStatusCode().value())
            .isIn(401, 403);

        // The basic-auth chain is scoped to this endpoint only: a normal logged-in
        // user's JWT must not become a way in.
        AuthResponse user = register("prom-plainuser");
        HttpHeaders jwtHeaders = new HttpHeaders();
        jwtHeaders.setBearerAuth(user.accessToken());
        assertThat(restTemplate.exchange("/actuator/prometheus", HttpMethod.GET, new HttpEntity<>(jwtHeaders), String.class)
            .getStatusCode().value()).isIn(401, 403);

        // The configured scraper credential works and returns OpenMetrics text.
        ResponseEntity<String> scraped = restTemplate
            .withBasicAuth("metrics", "dev-metrics-password-change-me")
            .getForEntity("/actuator/prometheus", String.class);
        assertThat(scraped.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(scraped.getBody()).contains("jvm_memory_used_bytes");

        // Wrong password is rejected.
        assertThat(restTemplate.withBasicAuth("metrics", "wrong")
            .getForEntity("/actuator/prometheus", String.class).getStatusCode().value()).isIn(401, 403);
    }

    @Test
    void scraperCredentialsDoNotUnlockOtherActuatorEndpoints() {
        // The basic-auth identity has ROLE_METRICS, not ROLE_ADMIN — it must not
        // reach the diagnostics endpoints that the main chain guards.
        assertThat(restTemplate.withBasicAuth("metrics", "dev-metrics-password-change-me")
            .getForEntity("/actuator/metrics", String.class).getStatusCode().value()).isIn(401, 403);
        assertThat(restTemplate.withBasicAuth("metrics", "dev-metrics-password-change-me")
            .getForEntity("/actuator/loggers", String.class).getStatusCode().value()).isIn(401, 403);
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
