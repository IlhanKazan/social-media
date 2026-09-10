package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.util.TokenGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * MfaEmailService caps guesses at MAX_ATTEMPTS, but the counter used to be dead code: verify()
 * joined the caller's transaction, and both callers throw immediately after a false return, so the
 * increment rolled back. Five wrong guesses left attempts at 0 and the correct code still worked.
 *
 * The login path is now capped by the challenge row as well, so the enable-2FA path is where this
 * counter is the only thing standing between a stolen access token and an unlimited brute force of
 * a six-digit code.
 */
class MfaSetupAttemptCapIntegrationTest extends BaseIntegrationTest {

    private static final String SETUP_CODE = "654321";

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void theSixthEnableAttemptFailsEvenWithTheCorrectCode() throws Exception {
        String username = "mfa-setup-user";
        String accessToken = register(username);
        seedSetupCode(username);

        for (int i = 0; i < 5; i++) {
            assertThat(enableEmailMfa(accessToken, "000000").getStatusCode())
                .as("wrong setup code #%d", i + 1)
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        assertThat(enableEmailMfa(accessToken, SETUP_CODE).getStatusCode())
            .as("the attempt cap must survive the rollback of the failing request")
            .isEqualTo(HttpStatus.UNAUTHORIZED);

        Integer enabled = jdbcTemplate.queryForObject(
            "SELECT CASE WHEN mfa_email_enabled THEN 1 ELSE 0 END FROM accounts WHERE username = ?",
            Integer.class, username);
        assertThat(enabled).as("2FA must not have been enabled").isZero();
    }

    @Test
    void aCorrectCodeWithinTheCapStillEnables2fa() throws Exception {
        String username = "mfa-setup-ok-user";
        String accessToken = register(username);
        seedSetupCode(username);

        assertThat(enableEmailMfa(accessToken, "000000").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(enableEmailMfa(accessToken, SETUP_CODE).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        Integer enabled = jdbcTemplate.queryForObject(
            "SELECT CASE WHEN mfa_email_enabled THEN 1 ELSE 0 END FROM accounts WHERE username = ?",
            Integer.class, username);
        assertThat(enabled).isOne();
    }

    private String register(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(
            username, username + "@example.com", "Pass123!", username, true, true);
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/auth/register", new HttpEntity<>(request), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        JsonNode body = objectMapper.readTree(response.getBody());
        return body.path("accessToken").asText();
    }

    private void seedSetupCode(String username) {
        Long accountId = jdbcTemplate.queryForObject(
            "SELECT id FROM accounts WHERE username = ?", Long.class, username);
        jdbcTemplate.update(
            "INSERT INTO mfa_codes (account_id, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, NOW())",
            accountId, TokenGenerator.hashToken(SETUP_CODE),
            java.sql.Timestamp.from(Instant.now().plusSeconds(600)));
    }

    private ResponseEntity<String> enableEmailMfa(String accessToken, String code) {
        rateLimitStore.clear();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.postForEntity("/api/v1/accounts/me/mfa/email/enable",
            new HttpEntity<>(Map.of("code", code), headers), String.class);
    }
}
