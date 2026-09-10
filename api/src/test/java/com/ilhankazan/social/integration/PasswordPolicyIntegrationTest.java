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
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Three DTOs carried three different rules (min 6 / 6 / 8) and register advertised max 100, which
 * BCrypt silently truncates at 72 bytes — so the tail of a long password was never verified.
 */
class PasswordPolicyIntegrationTest extends BaseIntegrationTest {

    private static final String GOOD_PASSWORD = "Str0ngPassphrase!";

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registrationRejectsShortPasswords() {
        assertThat(register("short-pw-user", "Abc123!").getStatusCode())
            .as("seven characters is below the aligned minimum of eight")
            .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void registrationRejectsACommonPassword() throws Exception {
        ResponseEntity<String> response = register("common-pw-user", "password123");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(codeOf(response))
            .as("length alone would have accepted this")
            .isEqualTo("PASSWORD_TOO_COMMON");
    }

    @Test
    void registrationAcceptsAStrongPassword() {
        assertThat(register("good-pw-user", GOOD_PASSWORD).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void changingPasswordIsHeldToTheSameRule() throws Exception {
        String username = "change-pw-user";
        String accessToken = objectMapper.readTree(register(username, GOOD_PASSWORD).getBody())
            .path("accessToken").asText();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        rateLimitStore.clear();
        ResponseEntity<String> response = restTemplate.exchange("/api/v1/accounts/me/password",
            HttpMethod.PUT,
            new HttpEntity<>(Map.of("oldPassword", GOOD_PASSWORD, "newPassword", "qwerty123"), headers),
            String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(codeOf(response)).isEqualTo("PASSWORD_TOO_COMMON");
    }

    @Test
    void resettingPasswordIsHeldToTheSameRule() throws Exception {
        String username = "reset-pw-user";
        register(username, GOOD_PASSWORD);

        Long accountId = jdbcTemplate.queryForObject(
            "SELECT id FROM accounts WHERE username = ?", Long.class, username);
        String plainToken = TokenGenerator.generateSecureToken();
        jdbcTemplate.update(
            "INSERT INTO password_reset_tokens (account_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
            accountId, TokenGenerator.hashToken(plainToken),
            java.sql.Timestamp.from(Instant.now().plusSeconds(600)),
            java.sql.Timestamp.from(Instant.now()));

        rateLimitStore.clear();
        ResponseEntity<String> response = restTemplate.postForEntity("/api/v1/auth/password-reset/confirm",
            new HttpEntity<>(Map.of("token", plainToken, "newPassword", "letmein1")), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(codeOf(response)).isEqualTo("PASSWORD_TOO_COMMON");

        Integer unused = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM password_reset_tokens WHERE account_id = ? AND used_at IS NULL",
            Integer.class, accountId);
        assertThat(unused)
            .as("a rejected password must not burn the reset token")
            .isOne();
    }

    private ResponseEntity<String> register(String username, String password) {
        rateLimitStore.clear();
        RegisterRequest request = new RegisterRequest(
            username, username + "@example.com", password, username, true, true);
        return restTemplate.postForEntity("/api/v1/auth/register", new HttpEntity<>(request), String.class);
    }

    private String codeOf(ResponseEntity<String> response) throws Exception {
        JsonNode body = objectMapper.readTree(response.getBody());
        return body.path("code").asText();
    }
}
