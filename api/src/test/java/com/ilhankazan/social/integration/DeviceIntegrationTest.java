package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.device.RegisterDeviceRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DeviceIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    private AuthResponse registerAndGetAuth(String username) throws Exception {
        RegisterRequest req = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", UUID.randomUUID().toString());
        HttpEntity<RegisterRequest> entity = new HttpEntity<>(req, headers);

        ResponseEntity<String> res = restTemplate.postForEntity("/api/v1/auth/register", entity, String.class);
        if (!res.getStatusCode().is2xxSuccessful()) throw new RuntimeException("Reg failed: " + res.getBody());
        return objectMapper.readValue(res.getBody(), AuthResponse.class);
    }

    @Test
    void shouldRegisterAndReRegisterDeviceToken() throws Exception {
        AuthResponse auth = registerAndGetAuth("device_user_1");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(auth.accessToken());

        RegisterDeviceRequest req = new RegisterDeviceRequest("fcm-token-abc", "ANDROID");

        ResponseEntity<String> first = restTemplate.exchange(
            "/api/v1/devices", HttpMethod.POST, new HttpEntity<>(req, headers), String.class);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Re-registering the same token (e.g. app relaunch) upserts rather than erroring.
        ResponseEntity<String> second = restTemplate.exchange(
            "/api/v1/devices", HttpMethod.POST, new HttpEntity<>(req, headers), String.class);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void shouldRejectInvalidPlatform() throws Exception {
        AuthResponse auth = registerAndGetAuth("device_user_2");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(auth.accessToken());

        RegisterDeviceRequest req = new RegisterDeviceRequest("fcm-token-xyz", "WINDOWS_PHONE");

        ResponseEntity<String> res = restTemplate.exchange(
            "/api/v1/devices", HttpMethod.POST, new HttpEntity<>(req, headers), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldRejectUnauthenticatedRegistration() {
        RegisterDeviceRequest req = new RegisterDeviceRequest("fcm-token-anon", "ANDROID");

        ResponseEntity<String> res = restTemplate.postForEntity("/api/v1/devices", req, String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void shouldUnregisterDeviceToken() throws Exception {
        AuthResponse auth = registerAndGetAuth("device_user_3");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(auth.accessToken());

        RegisterDeviceRequest req = new RegisterDeviceRequest("fcm-token-unreg", "ANDROID");
        restTemplate.exchange("/api/v1/devices", HttpMethod.POST, new HttpEntity<>(req, headers), String.class);

        ResponseEntity<String> res = restTemplate.exchange(
            "/api/v1/devices/fcm-token-unreg", HttpMethod.DELETE, new HttpEntity<>(headers), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Idempotent: unregistering an already-unregistered (or unknown) token is a silent no-op.
        ResponseEntity<String> again = restTemplate.exchange(
            "/api/v1/devices/fcm-token-unreg", HttpMethod.DELETE, new HttpEntity<>(headers), String.class);
        assertThat(again.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }
}
