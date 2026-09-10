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
    void adminCopyKeepsItsParagraphBreaks() {
        var rendered = registry.render("ADMIN_ALERT", "tr", EmailCategory.NOTIFICATION,
            "https://socialhan.example.com/api/v1/email/unsubscribe?token=x",
            Map.of("title", "Duyuru", "message", "Birinci satir.\n\nIkinci satir.",
                "link", "https://socialhan.example.com/changelog"));

        // Without this the two paragraphs render as one run-on line.
        assertThat(rendered.html()).contains("Birinci satir.<br/><br/>Ikinci satir.");
        // The text part keeps real newlines rather than markup.
        assertThat(rendered.text()).doesNotContain("<br/>");
    }

    @Test
    void adminCopyCannotBreakOutIntoMarkup() {
        var rendered = registry.render("ADMIN_ALERT", "tr", EmailCategory.NOTIFICATION, null,
            Map.of("title", "Duyuru", "message", "<script>alert(1)</script>",
                "link", "https://socialhan.example.com/changelog"));

        assertThat(rendered.html()).doesNotContain("<script>");
        assertThat(rendered.html()).contains("&lt;script&gt;");
    }

    @Test
    void urlsSurviveEscapingIntact() {
        var rendered = registry.render("WELCOME", "tr", EmailCategory.TRANSACTIONAL, null,
            Map.of("name", "Ali", "link", "https://socialhan.example.com/home?a=1&b=2"));

        // Escaping the ampersand would break the link in the href.
        assertThat(rendered.html()).contains("https://socialhan.example.com/home?a=1&b=2");
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
