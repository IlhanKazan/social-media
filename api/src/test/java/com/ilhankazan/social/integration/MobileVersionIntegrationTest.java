package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.admin.MobileReleaseRequest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.LoginRequest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.mobile.MobileVersionResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class MobileVersionIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void clearMobileReleaseSettings() {
        jdbcTemplate.update("DELETE FROM system_settings WHERE key LIKE 'mobile_%'");
        Cache cache = cacheManager.getCache("systemSettings");
        if (cache != null) {
            cache.clear();
        }
    }

    @Test
    void versionEndpointReturnsSafeDefaultsBeforeAnyReleaseIsConfigured() {
        ResponseEntity<MobileVersionResponse> response =
            restTemplate.getForEntity("/api/v1/mobile/version", MobileVersionResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        MobileVersionResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.latestVersionCode()).isZero();
        assertThat(body.minSupportedVersionCode()).isZero();
        assertThat(body.latestVersionName()).isEmpty();
        assertThat(body.apkUrl()).isEmpty();
        assertThat(body.changelogUrl()).isEmpty();
    }

    @Test
    void versionEndpointReflectsReleasePublishedByAdmin() throws Exception {
        String adminToken = registerAndPromoteToAdmin("mobile-rel-admin");

        MobileReleaseRequest release = new MobileReleaseRequest(
            42, "1.2.0", 40,
            "https://github.com/IlhanKazan/socialhan-releases/releases/download/v1.2.0/socialhan-1.2.0.apk",
            "a".repeat(64), "https://example.com/changelog");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);
        ResponseEntity<Void> putResponse = restTemplate.exchange(
            "/api/v1/admin/mobile-release", HttpMethod.PUT, new HttpEntity<>(release, headers), Void.class);
        assertThat(putResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<MobileVersionResponse> response =
            restTemplate.getForEntity("/api/v1/mobile/version", MobileVersionResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        MobileVersionResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.latestVersionCode()).isEqualTo(42);
        assertThat(body.latestVersionName()).isEqualTo("1.2.0");
        assertThat(body.minSupportedVersionCode()).isEqualTo(40);
        assertThat(body.apkUrl()).isEqualTo(
            "https://github.com/IlhanKazan/socialhan-releases/releases/download/v1.2.0/socialhan-1.2.0.apk");
        assertThat(body.apkSha256()).isEqualTo("a".repeat(64));
        assertThat(body.changelogUrl()).isEqualTo("https://example.com/changelog");
    }

    @Test
    void releasePublishingRejectsOffAccountUrlsAndABrickingMinimum() throws Exception {
        String adminToken = registerAndPromoteToAdmin("mobile-rel-validation");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(adminToken);

        String sha = "b".repeat(64);
        String validUrl =
            "https://github.com/IlhanKazan/socialhan-releases/releases/download/v1.0.0/app-1.0.0.apk";

        // Off-account, non-https, and script-scheme payloads must all be refused.
        for (String badUrl : new String[] {
            "javascript:alert(1)",
            "http://evil.example/malware.apk",
            "https://evil.example/malware.apk",
            "data:text/html;base64,PHNjcmlwdD4=",
            "file:///etc/passwd",
            "intent://evil#Intent;scheme=http;end",
            // A release asset under someone else's GitHub account.
            "https://github.com/attacker/socialhan-releases/releases/download/v1.0.0/app.apk",
            // Look-alike hosts and non-release GitHub paths.
            "https://github.com.evil.example/IlhanKazan/r/releases/download/v1/app.apk",
            "https://evil.example/github.com/IlhanKazan/r/releases/download/v1/app.apk",
            "https://raw.githubusercontent.com/IlhanKazan/r/main/app.apk",
            "https://github.com/IlhanKazan/r/raw/main/app.apk",
            // The retired self-hosted download path is no longer publishable.
            "https://api.example.com/api/v1/mobile/download/app-1.0.0.apk",
        }) {
            MobileReleaseRequest bad = new MobileReleaseRequest(42, "1.2.0", 40, badUrl, sha, null);
            assertThat(restTemplate.exchange("/api/v1/admin/mobile-release", HttpMethod.PUT,
                new HttpEntity<>(bad, headers), String.class).getStatusCode())
                .as("apkUrl %s must be rejected", badUrl)
                .isEqualTo(HttpStatus.BAD_REQUEST);
        }

        // A minimum above the latest build would hard-block every installed app.
        MobileReleaseRequest bricking = new MobileReleaseRequest(10, "1.0.0", 999_999, validUrl, sha, null);
        assertThat(restTemplate.exchange("/api/v1/admin/mobile-release", HttpMethod.PUT,
            new HttpEntity<>(bricking, headers), String.class).getStatusCode())
            .isEqualTo(HttpStatus.BAD_REQUEST);

        // The well-formed equivalent still succeeds.
        MobileReleaseRequest good = new MobileReleaseRequest(42, "1.2.0", 40, validUrl, sha, null);
        assertThat(restTemplate.exchange("/api/v1/admin/mobile-release", HttpMethod.PUT,
            new HttpEntity<>(good, headers), Void.class).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void retiredSelfHostedDownloadEndpointIsNoLongerPubliclyReachable() {
        ResponseEntity<String> response =
            restTemplate.getForEntity("/api/v1/mobile/download/{filename}", String.class, "app.apk");

        // The handler is gone and the path lost its permitAll, so anonymous callers
        // now fall through to the authenticated-by-default rule instead of a stream.
        assertThat(response.getStatusCode().value()).isIn(401, 403, 404);
    }

    @Test
    void adminMobileReleaseEndpointRejectsUnauthenticatedAndNonAdminCallers() throws Exception {
        MobileReleaseRequest release = new MobileReleaseRequest(
            1, "1.0.0", 1,
            "https://github.com/IlhanKazan/socialhan-releases/releases/download/v1.0.0/app.apk",
            "a".repeat(64), null);

        ResponseEntity<String> anonymous = restTemplate.exchange(
            "/api/v1/admin/mobile-release", HttpMethod.PUT, new HttpEntity<>(release), String.class);
        assertThat(anonymous.getStatusCode().value()).isIn(401, 403);

        AuthResponse plainUser = register("mobile-rel-plainuser");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(plainUser.accessToken());
        ResponseEntity<String> nonAdmin = restTemplate.exchange(
            "/api/v1/admin/mobile-release", HttpMethod.PUT, new HttpEntity<>(release, headers), String.class);
        assertThat(nonAdmin.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private String registerAndPromoteToAdmin(String username) throws Exception {
        register(username);
        jdbcTemplate.update(
            "UPDATE accounts SET role_id = (SELECT id FROM roles WHERE name = 'ROLE_ADMIN') WHERE username = ?",
            username);

        ResponseEntity<String> loginResponse = restTemplate.postForEntity(
            "/api/v1/auth/login", new LoginRequest(username, "Password123!"), String.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(loginResponse.getBody());
        return body.path("accessToken").asText();
    }

    private AuthResponse register(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(
            username, username + "@example.com", "Password123!", username, true, true);
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", UUID.randomUUID().toString());
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/v1/auth/register", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return objectMapper.readValue(response.getBody(), AuthResponse.class);
    }
}
