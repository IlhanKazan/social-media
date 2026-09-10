package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The @RateLimit bucket on /auth/login is keyed by IP and held in process, so it survives neither a
 * source-address rotation nor a second replica. Nothing counted failures per account, which is what
 * actually bounds distributed credential stuffing.
 */
class LoginLockoutIntegrationTest extends BaseIntegrationTest {

    private static final String PASSWORD = "Str0ngPassphrase!";

    @Test
    void tenWrongPasswordsLockTheAccountEvenForTheRightOne() {
        String username = "lockout-user";
        register(username);

        for (int i = 0; i < 10; i++) {
            assertThat(login(username, "WrongPassphrase!").getStatusCode())
                .as("wrong password #%d", i + 1)
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        assertThat(login(username, PASSWORD).getStatusCode())
            .as("the correct password must not get in while the account is locked")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void theLockExpiresOnItsOwn() {
        String username = "lockout-expiry-user";
        register(username);

        for (int i = 0; i < 10; i++) {
            login(username, "WrongPassphrase!");
        }
        assertThat(login(username, PASSWORD).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        jdbcTemplate.update(
            "UPDATE accounts SET lockout_until = NOW() - INTERVAL '1 minute' WHERE username = ?", username);

        assertThat(login(username, PASSWORD).getStatusCode())
            .as("the lock is temporary, not a permanent ban")
            .isEqualTo(HttpStatus.OK);
    }

    @Test
    void aSuccessfulLoginClearsTheCounter() {
        String username = "lockout-reset-user";
        register(username);

        for (int i = 0; i < 9; i++) {
            login(username, "WrongPassphrase!");
        }
        assertThat(login(username, PASSWORD).getStatusCode())
            .as("still under the threshold")
            .isEqualTo(HttpStatus.OK);

        Integer attempts = jdbcTemplate.queryForObject(
            "SELECT failed_login_attempts FROM accounts WHERE username = ?", Integer.class, username);
        assertThat(attempts).isZero();

        for (int i = 0; i < 9; i++) {
            assertThat(login(username, "WrongPassphrase!").getStatusCode())
                .as("a fresh budget after the successful login")
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        }
        assertThat(login(username, PASSWORD).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void aLockedAccountIsIndistinguishableFromOneThatDoesNotExist() throws Exception {
        String username = "lockout-oracle-user";
        register(username);
        for (int i = 0; i < 10; i++) {
            login(username, "WrongPassphrase!");
        }

        ResponseEntity<String> locked = login(username, PASSWORD);
        ResponseEntity<String> unknown = login("no-such-account-at-all", PASSWORD);

        assertThat(locked.getStatusCode()).isEqualTo(unknown.getStatusCode());
        // Everything but the timestamp: the error code and message are what would leak.
        assertThat(codeAndMessage(locked))
            .as("the response must not reveal that the account exists and is locked")
            .isEqualTo(codeAndMessage(unknown));
    }

    private String codeAndMessage(ResponseEntity<String> response) throws Exception {
        JsonNode body = new ObjectMapper().readTree(response.getBody());
        return body.path("code").asText() + "|" + body.path("message").asText();
    }

    private void register(String username) {
        RegisterRequest request = new RegisterRequest(
            username, username + "@example.com", PASSWORD, username, true, true);
        rateLimitStore.clear();
        assertThat(restTemplate.postForEntity("/api/v1/auth/register", new HttpEntity<>(request), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    private ResponseEntity<String> login(String identifier, String password) {
        rateLimitStore.clear();
        return restTemplate.postForEntity("/api/v1/auth/login",
            new HttpEntity<>(Map.of("identifier", identifier, "password", password)), String.class);
    }
}
