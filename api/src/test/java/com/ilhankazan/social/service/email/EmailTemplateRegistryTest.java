package com.ilhankazan.social.service.email;

import com.ilhankazan.social.config.AppProperties;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EmailTemplateRegistryTest {

    private final AppProperties.EmailProperties props = new AppProperties.EmailProperties(
        true, "resend", "noreply@socialhan.dev", "Socialhan", "", 90, 2800,
        "Socialhan", "https://example.com/logo.png"
    );
    private final EmailTemplateRegistry registry = new EmailTemplateRegistry(props);

    @Test
    void rendersBrandedTemplatesAndWritesPreviews() throws Exception {
        Map<String, String> welcomeParams = Map.of("name", "Ada", "link", "https://socialhan.dev");
        String welcome = registry.renderHtml("WELCOME", welcomeParams);
        assertThat(welcome)
            .contains("Socialhan")
            .contains("https://example.com/logo.png")
            .contains("https://socialhan.dev")
            .contains("Start posting");

        String reset = registry.renderHtml("PASSWORD_RESET", Map.of("resetLink", "https://socialhan.dev/reset?token=abc"));
        assertThat(reset).contains("Reset password").contains("https://socialhan.dev/reset?token=abc");

        String verify = registry.renderHtml("EMAIL_VERIFICATION", Map.of("verifyLink", "https://socialhan.dev/verify?token=abc"));
        assertThat(verify).contains("Verify email").contains("https://socialhan.dev/verify?token=abc");

        String alert = registry.renderHtml("ADMIN_ALERT", Map.of("title", "Heads up", "message", "Maintenance tonight."));
        assertThat(alert).contains("Heads up").contains("Maintenance tonight.").doesNotContain("Verify email");

        assertThat(registry.renderText("WELCOME", welcomeParams))
            .contains("Socialhan").contains("https://socialhan.dev");

        Path dir = Path.of("target/email-previews");
        Files.createDirectories(dir);
        Files.writeString(dir.resolve("welcome.html"), welcome);
        Files.writeString(dir.resolve("password-reset.html"), reset);
        Files.writeString(dir.resolve("email-verification.html"), verify);
        Files.writeString(dir.resolve("admin-alert.html"), alert);
    }
}
