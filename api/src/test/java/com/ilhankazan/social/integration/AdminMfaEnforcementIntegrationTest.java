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

import static org.assertj.core.api.Assertions.assertThat;

/** The most privileged account must not rest on a password alone. */
class AdminMfaEnforcementIntegrationTest extends BaseIntegrationTest {

    private static final String PASSWORD = "Str0ngPassphrase!";

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void anAdminWithoutASecondFactorIsRefusedTheAdminApi() throws Exception {
        String token = registerAdmin("admin-no-mfa");

        ResponseEntity<String> response = get("/api/v1/admin/metrics", token);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(objectMapper.readTree(response.getBody()).path("code").asText())
            .isEqualTo("ADMIN_MFA_REQUIRED");
    }

    @Test
    void thatSameAdminGetsInOnceASecondFactorIsOn() throws Exception {
        String username = "admin-with-mfa";
        String token = registerAdmin(username);
        assertThat(get("/api/v1/admin/metrics", token).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        jdbcTemplate.update("UPDATE accounts SET mfa_email_enabled = true WHERE username = ?", username);

        assertThat(get("/api/v1/admin/metrics", token).getStatusCode())
            .as("the same token works once the account carries a second factor")
            .isEqualTo(HttpStatus.OK);
    }

    /**
     * The recovery route out of a locked panel. TOTP enrolment is the one that always works:
     * email 2FA additionally requires a verified address, which an admin may not have.
     */
    @Test
    void anAdminWithoutMfaCanStillEnrolInTotp() throws Exception {
        String token = registerAdmin("admin-recovery");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        rateLimitStore.clear();
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/accounts/me/mfa/totp/setup", new HttpEntity<>(headers), String.class);

        assertThat(response.getStatusCode())
            .as("otherwise a locked-out admin could never recover")
            .isEqualTo(HttpStatus.OK);
        assertThat(objectMapper.readTree(response.getBody()).path("secret").asText()).isNotBlank();
    }

    @Test
    void ordinaryUsersAndPublicProbesAreUnaffected() throws Exception {
        String token = register("plain-user-mfa-guard");

        assertThat(get("/api/v1/admin/metrics", token).getStatusCode())
            .as("a non-admin is still refused by role, not by this filter")
            .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(objectMapper.readTree(get("/api/v1/admin/metrics", token).getBody()).path("code").asText())
            .isNotEqualTo("ADMIN_MFA_REQUIRED");

        assertThat(restTemplate.getForEntity("/actuator/health", String.class).getStatusCode())
            .as("the public health probe must stay anonymous")
            .isEqualTo(HttpStatus.OK);
    }

    private String registerAdmin(String username) throws Exception {
        register(username);
        jdbcTemplate.update(
            "UPDATE accounts SET role_id = (SELECT id FROM roles WHERE name = 'ROLE_ADMIN') WHERE username = ?",
            username);

        rateLimitStore.clear();
        ResponseEntity<String> login = restTemplate.postForEntity("/api/v1/auth/login",
            new HttpEntity<>(java.util.Map.of("identifier", username, "password", PASSWORD)), String.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        return objectMapper.readTree(login.getBody()).path("accessToken").asText();
    }

    private String register(String username) throws Exception {
        rateLimitStore.clear();
        RegisterRequest request = new RegisterRequest(
            username, username + "@example.com", PASSWORD, username, true, true);
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/auth/register", new HttpEntity<>(request), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode body = objectMapper.readTree(response.getBody());
        return body.path("accessToken").asText();
    }

    private ResponseEntity<String> get(String path, String token) {
        rateLimitStore.clear();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return restTemplate.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), String.class);
    }
}
