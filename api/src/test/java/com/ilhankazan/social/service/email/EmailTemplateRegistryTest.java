package com.ilhankazan.social.service.email;

import com.ilhankazan.social.config.AppProperties;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EmailTemplateRegistryTest {

    private final AppProperties.EmailProperties props = new AppProperties.EmailProperties(
        true, "resend", "noreply@socialhan.dev", "SocialHan", "", 90, 2800,
        "SocialHan", "https://socialhan.dev/logo.png"
    );
    private final EmailTemplateRegistry registry = new EmailTemplateRegistry(props);

    @Test
    void welcomeCarriesTheRecipientNameAndLink() {
        var rendered = registry.render("WELCOME", "tr", EmailCategory.TRANSACTIONAL, null,
            Map.of("name", "Ali", "link", "https://socialhan.dev/home"));

        assertThat(rendered.html()).contains("Ali").contains("https://socialhan.dev/home");
        assertThat(rendered.text()).contains("Ali").contains("https://socialhan.dev/home");
        assertThat(rendered.subject()).isNotBlank();
        // No placeholder should survive into a sent message.
        assertThat(rendered.html()).doesNotContain("{{");
    }

    @Test
    void subjectAndBodyFollowTheRecipientLanguage() {
        var tr = registry.render("PASSWORD_RESET", "tr", EmailCategory.TRANSACTIONAL, null,
            Map.of("resetLink", "https://socialhan.dev/reset?token=abc"));
        var en = registry.render("PASSWORD_RESET", "en", EmailCategory.TRANSACTIONAL, null,
            Map.of("resetLink", "https://socialhan.dev/reset?token=abc"));

        assertThat(tr.subject()).isNotEqualTo(en.subject());
        assertThat(tr.html()).contains("Şifreni sıfırla");
        assertThat(en.html()).contains("Reset your password");
    }

    @Test
    void anUnknownLanguageFallsBackRatherThanFailing() {
        var rendered = registry.render("WELCOME", "de", EmailCategory.TRANSACTIONAL, null,
            Map.of("name", "Ali", "link", "https://socialhan.dev/home"));

        assertThat(rendered.html()).contains("Hoş geldin");
    }

    @Test
    void transactionalMailNeverCarriesAnOptOut() {
        // Passing a URL is not enough: the category decides, so a caller cannot
        // accidentally attach an opt-out to a password reset.
        var rendered = registry.render("PASSWORD_RESET", "tr", EmailCategory.TRANSACTIONAL,
            "https://socialhan.dev/api/v1/email/unsubscribe?token=x",
            Map.of("resetLink", "https://socialhan.dev/reset"));

        assertThat(rendered.html()).doesNotContain("unsubscribe?token=x");
    }

    @Test
    void notificationMailCarriesTheOptOutLink() {
        var rendered = registry.render("NOTIFICATION_DIGEST", "tr", EmailCategory.NOTIFICATION,
            "https://socialhan.dev/api/v1/email/unsubscribe?token=x",
            Map.of("message", "3 yeni yanıt", "link", "https://socialhan.dev/home"));

        assertThat(rendered.html())
            .contains("unsubscribe?token=x")
            .contains("Bu e-postaları almayı bırak");
    }

    @Test
    void theMfaCodeIsRenderedInBothParts() {
        var rendered = registry.render("MFA_CODE", "tr", EmailCategory.TRANSACTIONAL, null,
            Map.of("code", "483920", "minutes", "10"));

        assertThat(rendered.html()).contains("483920");
        assertThat(rendered.text()).contains("483920");
        assertThat(rendered.subject()).contains("483920");
    }

    @Test
    void everyMessageHasAPlainTextPart() {
        for (String template : new String[] {"WELCOME", "PASSWORD_RESET", "EMAIL_VERIFICATION", "MFA_CODE"}) {
            var rendered = registry.render(template, "en", EmailCategory.TRANSACTIONAL, null,
                Map.of("name", "A", "link", "https://x.dev", "resetLink", "https://x.dev",
                    "verifyLink", "https://x.dev", "code", "1", "minutes", "5"));
            assertThat(rendered.text()).as("%s text part", template).isNotBlank();
            // Tags leaking into the text part is the usual way this breaks.
            assertThat(rendered.text()).as("%s text part is not HTML", template).doesNotContain("<p");
        }
    }
}
