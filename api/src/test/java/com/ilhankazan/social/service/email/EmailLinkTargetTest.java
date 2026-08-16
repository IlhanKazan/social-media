package com.ilhankazan.social.service.email;

import com.ilhankazan.social.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards where the links in an email point.
 *
 * These were once derived from the logo URL, on the reasoning that it already
 * named the public site. It does not — the logo is served from a CDN, so every
 * privacy and terms link in every email pointed at the image host instead.
 */
class EmailLinkTargetTest {

    private final AppProperties.EmailProperties props = new AppProperties.EmailProperties(
        true, "resend", "noreply@socialhan.dev", "SocialHan", "", 90, 2800,
        "SocialHan",
        // Deliberately a CDN host, as it is in production.
        "https://res.cloudinary.com/demo/image/upload/logo.png"
    );

    private final MockEnvironment env = new MockEnvironment()
        .withProperty("FRONTEND_ORIGIN", "https://socialhan.example.com");

    private final EmailTemplateRegistry registry = new EmailTemplateRegistry(props, env);

    @Test
    void footerLinksPointAtTheSiteNotTheImageHost() {
        var rendered = registry.render("WELCOME", "tr", EmailCategory.TRANSACTIONAL, null,
            Map.of("name", "Ali", "link", "https://socialhan.example.com/home"));

        assertThat(rendered.html())
            .contains("https://socialhan.example.com/privacy")
            .contains("https://socialhan.example.com/terms");

        // The logo may still be served from the CDN, but nothing navigational
        // may point there.
        assertThat(rendered.html()).doesNotContain("res.cloudinary.com/privacy");
        assertThat(rendered.html()).doesNotContain("res.cloudinary.com/terms");
    }

    @Test
    void aTrailingSlashOnTheOriginDoesNotDoubleUp() {
        var withSlash = new EmailTemplateRegistry(props,
            new MockEnvironment().withProperty("FRONTEND_ORIGIN", "https://socialhan.example.com/"));

        var rendered = withSlash.render("WELCOME", "en", EmailCategory.TRANSACTIONAL, null,
            Map.of("name", "Ali", "link", "https://socialhan.example.com/home"));

        assertThat(rendered.html()).doesNotContain("//privacy");
    }
}
