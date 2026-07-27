package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.LoginRequest;
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

class MfaLoginIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void loginWithMfaReturnsChallengeAndTheChallengeTokenCannotAccessApi() throws Exception {
        register("mfauser");
        jdbcTemplate.update("UPDATE accounts SET mfa_email_enabled = true WHERE username = 'mfauser'");

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", UUID.randomUUID().toString());
        ResponseEntity<String> login = restTemplate.exchange("/api/v1/auth/login", HttpMethod.POST,
            new HttpEntity<>(new LoginRequest("mfauser", "Pass123!"), headers), String.class);

        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        var body = objectMapper.readTree(login.getBody());
        assertThat(body.get("status").asText()).isEqualTo("MFA_REQUIRED");
        assertThat(body.get("mfaToken").asText()).isNotBlank();
        assertThat(body.has("accessToken")).as("no access token before the second factor").isFalse();
        assertThat(login.getHeaders().getFirst(HttpHeaders.SET_COOKIE))
            .as("no refresh cookie before the second factor").isNull();

        // The MFA challenge token must not authenticate an API request.
        HttpHeaders bearer = new HttpHeaders();
        bearer.setBearerAuth(body.get("mfaToken").asText());
        ResponseEntity<String> me = restTemplate.exchange("/api/v1/accounts/me", HttpMethod.GET,
            new HttpEntity<>(bearer), String.class);
        assertThat(me.getStatusCode().value()).isIn(401, 403);
    }

    /**
     * Starting TOTP setup rotates the secret and clears the enabled flag. While TOTP
     * is live that must be refused, otherwise a stolen access token alone switches
     * MFA off — bypassing the password that disableTotp() requires.
     */
    @Test
    void startingTotpSetupWhileEnabledIsRefusedAndLeavesMfaOn() throws Exception {
        register("totpuser");

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", UUID.randomUUID().toString());
        ResponseEntity<String> login = restTemplate.exchange("/api/v1/auth/login", HttpMethod.POST,
            new HttpEntity<>(new LoginRequest("totpuser", "Pass123!"), headers), String.class);
        String accessToken = objectMapper.readTree(login.getBody()).get("accessToken").asText();

        // Simulate an account with authenticator MFA already active.
        jdbcTemplate.update(
            "UPDATE accounts SET mfa_totp_enabled = true, mfa_totp_secret = 'x' WHERE username = 'totpuser'");

        HttpHeaders bearer = new HttpHeaders();
        bearer.setBearerAuth(accessToken);
        ResponseEntity<String> setup = restTemplate.exchange("/api/v1/accounts/me/mfa/totp/setup",
            HttpMethod.POST, new HttpEntity<>(bearer), String.class);

        assertThat(setup.getStatusCode())
            .as("re-running setup on a live TOTP account must be refused")
            .isEqualTo(HttpStatus.CONFLICT);

        Boolean stillEnabled = jdbcTemplate.queryForObject(
            "SELECT mfa_totp_enabled FROM accounts WHERE username = 'totpuser'", Boolean.class);
        assertThat(stillEnabled).as("MFA must remain enabled").isTrue();

        // And the next login must still demand the second factor.
        HttpHeaders h2 = new HttpHeaders();
        h2.add("X-Forwarded-For", UUID.randomUUID().toString());
        ResponseEntity<String> relogin = restTemplate.exchange("/api/v1/auth/login", HttpMethod.POST,
            new HttpEntity<>(new LoginRequest("totpuser", "Pass123!"), h2), String.class);
        assertThat(objectMapper.readTree(relogin.getBody()).get("status").asText()).isEqualTo("MFA_REQUIRED");
    }

    private void register(String username) {
        RegisterRequest req = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", UUID.randomUUID().toString());
        ResponseEntity<String> r = restTemplate.exchange("/api/v1/auth/register", HttpMethod.POST,
            new HttpEntity<>(req, headers), String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }
}
