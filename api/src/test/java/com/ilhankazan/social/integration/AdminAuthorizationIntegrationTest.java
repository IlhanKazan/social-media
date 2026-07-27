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
import org.springframework.http.ResponseEntity;
import org.springframework.util.ClassUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.context.ApplicationContext;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Authorization for admin endpoints is enforced centrally in SecurityConfig via
 * `.requestMatchers("/api/v1/admin/**").hasRole("ADMIN")`, not per-method
 * annotations. These tests pin that behaviour down so the rule can't silently
 * regress, and so a future admin controller mapped outside `/api/v1/admin/**`
 * (which would escape the rule) fails the build instead of shipping open.
 */
class AdminAuthorizationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ApplicationContext applicationContext;

    // One representative route per admin controller.
    private static final List<Map.Entry<HttpMethod, String>> ADMIN_ROUTES = List.of(
        Map.entry(HttpMethod.GET, "/api/v1/admin/metrics"),
        Map.entry(HttpMethod.GET, "/api/v1/admin/audit-log"),
        Map.entry(HttpMethod.GET, "/api/v1/admin/users"),
        Map.entry(HttpMethod.GET, "/api/v1/admin/settings"),
        Map.entry(HttpMethod.GET, "/api/v1/admin/mobile-release"),
        Map.entry(HttpMethod.GET, "/api/v1/admin/moderation-queue"),
        Map.entry(HttpMethod.GET, "/api/v1/admin/reports"),
        Map.entry(HttpMethod.GET, "/api/v1/admin/ops/caches"),
        Map.entry(HttpMethod.POST, "/api/v1/admin/ops/caches/invalidate"),
        Map.entry(HttpMethod.POST, "/api/v1/admin/ops/rate-limits/reset")
    );

    @Test
    void everyAdminRouteRejectsAnonymousCallers() {
        for (Map.Entry<HttpMethod, String> route : ADMIN_ROUTES) {
            ResponseEntity<String> response = restTemplate.exchange(
                route.getValue(), route.getKey(), HttpEntity.EMPTY, String.class);

            assertThat(response.getStatusCode().value())
                .as("anonymous %s %s must be rejected", route.getKey(), route.getValue())
                .isIn(401, 403);
        }
    }

    @Test
    void everyAdminRouteRejectsAuthenticatedNonAdminCallers() throws Exception {
        AuthResponse user = register("plain-user-" + UUID.randomUUID().toString().substring(0, 8));
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(user.accessToken());

        for (Map.Entry<HttpMethod, String> route : ADMIN_ROUTES) {
            ResponseEntity<String> response = restTemplate.exchange(
                route.getValue(), route.getKey(), new HttpEntity<>(headers), String.class);

            assertThat(response.getStatusCode().value())
                .as("non-admin %s %s must be forbidden", route.getKey(), route.getValue())
                .isEqualTo(403);
        }
    }

    /**
     * The central rule only covers `/api/v1/admin/**`. If someone adds an admin
     * controller under a different path it would fall through to
     * `.anyRequest().authenticated()` — reachable by ANY logged-in user.
     */
    @Test
    void everyAdminControllerIsMappedUnderTheAdminPathPrefix() {
        Map<String, Object> controllers = applicationContext.getBeansWithAnnotation(RestController.class);

        List<String> misplaced = controllers.entrySet().stream()
            // Unwrap CGLIB proxies: @RequestMapping is not @Inherited, so reading it
            // off the proxy subclass would report every proxied controller as unmapped.
            .map(entry -> Map.entry(entry.getKey(), ClassUtils.getUserClass(entry.getValue())))
            .filter(entry -> entry.getValue().getPackageName().contains(".controller.admin"))
            .filter(entry -> {
                RequestMapping mapping = entry.getValue().getAnnotation(RequestMapping.class);
                if (mapping == null || mapping.value().length == 0) return true;
                return !mapping.value()[0].startsWith("/api/v1/admin");
            })
            .map(Map.Entry::getKey)
            .toList();

        assertThat(misplaced)
            .as("admin controllers must be mapped under /api/v1/admin/** so SecurityConfig's hasRole(ADMIN) rule covers them")
            .isEmpty();
    }

    private AuthResponse register(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(
            username, username + "@example.com", "Password123!", username, true, true);
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", UUID.randomUUID().toString());
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/v1/auth/register", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);
        return objectMapper.readValue(response.getBody(), AuthResponse.class);
    }
}
