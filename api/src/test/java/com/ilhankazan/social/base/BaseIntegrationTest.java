package com.ilhankazan.social.base;

import com.ilhankazan.social.security.RateLimitStore;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    @Autowired
    protected TestRestTemplate restTemplate;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @Autowired
    protected RateLimitStore rateLimitStore;

    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("social_test")
        .withUsername("test_user")
        .withPassword("test_pass");

    static {
        postgres.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.clean-disabled", () -> "false");
    }

    // Rate-limit keys are now remoteAddr-based, so every test shares 127.0.0.1 and buckets must reset per test.
    @BeforeEach
    void resetRateLimits() {
        rateLimitStore.clear();
    }

    private static final String TRUNCATE_ALL =
        "TRUNCATE TABLE refresh_tokens, login_history, messages, conversations, notifications, follows, interactions, posts, accounts RESTART IDENTITY CASCADE";

    /**
     * TRUNCATE needs an AccessExclusiveLock on every listed table, but the @Async
     * listeners a test kicked off (audit log, login history, notifications) can
     * still be mid-transaction holding row locks and waiting on a foreign-key
     * check — a circular wait Postgres resolves by killing one side. That surfaced
     * as an intermittent CI failure with no relation to the code under test.
     * Retrying is enough: the async work finishes in milliseconds, and by the next
     * attempt the locks are gone.
     */
    @AfterEach
    void cleanDatabase() {
        int attempts = 0;
        while (true) {
            try {
                jdbcTemplate.execute(TRUNCATE_ALL);
                return;
            } catch (PessimisticLockingFailureException e) {
                if (++attempts >= 5) {
                    throw e;
                }
                try {
                    Thread.sleep(100L * attempts);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw e;
                }
            }
        }
    }
}
