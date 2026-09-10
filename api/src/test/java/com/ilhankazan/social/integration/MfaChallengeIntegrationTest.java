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
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The challenge token is a JWT, so before it was bound to a server-side row it proved only that we
 * minted it: one token completed MFA repeatedly, survived logout-all and a password change, and
 * allowed unlimited guesses (measured: 26 failures, then the correct code was still accepted).
 */
class MfaChallengeIntegrationTest extends BaseIntegrationTest {

    private static final String EMAIL_CODE = "123456";

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void aChallengeTokenCompletesMfaOnlyOnce() throws Exception {
        String username = "mfa-once-user";
        registerWithEmailMfa(username);
        String mfaToken = startChallenge(username);
        seedEmailCode(username);

        assertThat(verify(mfaToken, EMAIL_CODE).getStatusCode())
            .as("first use completes the login")
            .isEqualTo(HttpStatus.OK);

        seedEmailCode(username);
        assertThat(verify(mfaToken, EMAIL_CODE).getStatusCode())
            .as("the same challenge token must not mint a second session")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void fiveWrongCodesBurnTheChallengeSoTheCorrectOneNoLongerWorks() throws Exception {
        String username = "mfa-lock-user";
        registerWithEmailMfa(username);
        String mfaToken = startChallenge(username);
        seedEmailCode(username);

        for (int i = 0; i < 5; i++) {
            assertThat(verify(mfaToken, "000000").getStatusCode())
                .as("wrong code #%d", i + 1)
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        seedEmailCode(username);
        assertThat(verify(mfaToken, EMAIL_CODE).getStatusCode())
            .as("the correct code must not be accepted once the challenge is burned")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void burningChallengesByRelogginInStillHitsTheAccountWindow() throws Exception {
        String username = "mfa-window-user";
        registerWithEmailMfa(username);

        // Two challenges at five failures each exhausts the per-account window.
        for (int challenge = 0; challenge < 2; challenge++) {
            String mfaToken = startChallenge(username);
            for (int i = 0; i < 5; i++) {
                verify(mfaToken, "000000");
            }
        }

        String freshToken = startChallenge(username);
        seedEmailCode(username);
        ResponseEntity<String> response = verify(freshToken, EMAIL_CODE);

        assertThat(response.getStatusCode())
            .as("a fresh challenge must not reset the account-level failure budget")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void pendingChallengeDiesWithLogoutAll() throws Exception {
        String username = "mfa-logoutall-user";
        registerWithEmailMfa(username);

        String firstToken = startChallenge(username);
        seedEmailCode(username);
        String accessToken = objectMapper.readTree(verify(firstToken, EMAIL_CODE).getBody())
            .path("accessToken").asText();

        String pendingToken = startChallenge(username);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        assertThat(restTemplate.postForEntity("/api/v1/auth/logout-all", new HttpEntity<>(headers), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        seedEmailCode(username);
        assertThat(verify(pendingToken, EMAIL_CODE).getStatusCode())
            .as("logout-all must invalidate a challenge that was still in flight")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void pendingChallengeDiesWithAPasswordReset() throws Exception {
        String username = "mfa-reset-user";
        registerWithEmailMfa(username);
        String pendingToken = startChallenge(username);

        Long accountId = jdbcTemplate.queryForObject(
            "SELECT id FROM accounts WHERE username = ?", Long.class, username);
        String plainToken = TokenGenerator.generateSecureToken();
        jdbcTemplate.update(
            "INSERT INTO password_reset_tokens (account_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
            accountId, TokenGenerator.hashToken(plainToken),
            java.sql.Timestamp.from(Instant.now().plusSeconds(600)),
            java.sql.Timestamp.from(Instant.now()));

        assertThat(restTemplate.postForEntity("/api/v1/auth/password-reset/confirm",
            new HttpEntity<>(Map.of("token", plainToken, "newPassword", "NewPass123!")), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        seedEmailCode(username);
        assertThat(verify(pendingToken, EMAIL_CODE).getStatusCode())
            .as("a password reset must not leave a usable second-factor session behind")
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void concurrentVerificationsOfOneChallengeMintExactlyOneSession() throws Exception {
        String username = "mfa-race-user";
        registerWithEmailMfa(username);
        String mfaToken = startChallenge(username);
        seedEmailCode(username);

        rateLimitStore.clear();
        ExecutorService pool = Executors.newFixedThreadPool(6);
        try {
            List<Future<HttpStatus>> attempts = IntStream.range(0, 6)
                .mapToObj(i -> pool.submit(() -> (HttpStatus) restTemplate.postForEntity(
                    "/api/v1/auth/mfa/verify",
                    new HttpEntity<>(Map.of("mfaToken", mfaToken, "method", "EMAIL", "code", EMAIL_CODE)),
                    String.class).getStatusCode()))
                .toList();

            long succeeded = 0;
            for (Future<HttpStatus> attempt : attempts) {
                if (attempt.get() == HttpStatus.OK) succeeded++;
            }

            assertThat(succeeded)
                .as("single-use has to hold under concurrency: read-then-write let 5 of 6 through")
                .isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
    }

    private void registerWithEmailMfa(String username) {
        RegisterRequest request = new RegisterRequest(
            username, username + "@example.com", "Pass123!", username, true, true);
        assertThat(restTemplate.postForEntity("/api/v1/auth/register", new HttpEntity<>(request), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.CREATED);
        jdbcTemplate.update("UPDATE accounts SET mfa_email_enabled = true WHERE username = ?", username);
    }

    /** Logs in and returns the challenge token, without relying on the emailed code. */
    private String startChallenge(String username) throws Exception {
        rateLimitStore.clear();
        ResponseEntity<String> login = restTemplate.postForEntity("/api/v1/auth/login",
            new HttpEntity<>(Map.of("identifier", username, "password", "Pass123!")), String.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);

        JsonNode body = objectMapper.readTree(login.getBody());
        assertThat(body.path("status").asText()).isEqualTo("MFA_REQUIRED");
        return body.path("mfaToken").asText();
    }

    /**
     * Writes a code row with a known plaintext. The emailed code is only ever stored hashed, so a
     * test cannot otherwise present a correct one.
     */
    private void seedEmailCode(String username) {
        Long accountId = jdbcTemplate.queryForObject(
            "SELECT id FROM accounts WHERE username = ?", Long.class, username);
        jdbcTemplate.update("UPDATE mfa_codes SET used_at = NOW() WHERE account_id = ? AND used_at IS NULL", accountId);
        jdbcTemplate.update(
            "INSERT INTO mfa_codes (account_id, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, NOW())",
            accountId, TokenGenerator.hashToken(EMAIL_CODE),
            java.sql.Timestamp.from(Instant.now().plusSeconds(600)));
    }

    private ResponseEntity<String> verify(String mfaToken, String code) {
        rateLimitStore.clear();
        return restTemplate.postForEntity("/api/v1/auth/mfa/verify",
            new HttpEntity<>(Map.of("mfaToken", mfaToken, "method", "EMAIL", "code", code)), String.class);
    }
}
