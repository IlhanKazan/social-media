package com.ilhankazan.social.service.email;

import com.ilhankazan.social.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.time.Year;
import java.util.Map;

/**
 * Builds the HTML and plain-text bodies for every outgoing email.
 *
 * Table-based with inline styles, because email clients are not browsers:
 * Outlook still renders through Word, Gmail strips most of a stylesheet, and
 * flexbox is unreliable across the set. The one embedded style block carries
 * only the dark-mode overrides, which clients that ignore it simply skip while
 * the inline light styles keep working.
 *
 * Every message also carries a plain-text part. It is not a fallback nobody
 * sees — spam filters weigh its absence, and some clients prefer it outright.
 */
@Component
@RequiredArgsConstructor
public class EmailTemplateRegistry {

    private final AppProperties.EmailProperties emailProps;
    private final Environment env;

    private static final String INK = "#0a0a0a";
    private static final String PAPER = "#ffffff";
    private static final String CANVAS = "#f2f2f4";
    private static final String TEXT = "#18181b";
    private static final String MUTED = "#6b7280";
    private static final String RULE = "#e6e6ea";

    private static final String P =
        "margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;"
            + "font-size:15px;line-height:1.65;color:" + TEXT + ";";

    public record Rendered(String subject, String html, String text) {}

    /**
     * @param unsubscribeUrl one-click opt-out link, or null for transactional mail
     */
    public Rendered render(String templateName, String language, EmailCategory category,
                           String unsubscribeUrl, Map<String, String> params) {
        String lang = EmailCopy.normalise(language);
        EmailCopy.Template copy = EmailCopy.template(lang, templateName);

        Map<String, String> all = withDefaults(params);
        String ctaUrl = ctaUrlFor(templateName, all);

        String html = layout(lang, copy, ctaUrl,
            category.isUnsubscribable() ? unsubscribeUrl : null, all);
        String text = plainText(lang, copy, ctaUrl, all);

        return new Rendered(
            apply(copy.subject(), all),
            apply(html, all),
            apply(text, all)
        );
    }

    /** Each template names its own link parameter; the layout only needs the value. */
    private String ctaUrlFor(String templateName, Map<String, String> params) {
        return switch (templateName) {
            case "PASSWORD_RESET" -> params.get("resetLink");
            case "EMAIL_VERIFICATION" -> params.get("verifyLink");
            case "WELCOME", "NOTIFICATION_DIGEST" -> params.get("link");
            default -> null;
        };
    }

    private String layout(String lang, EmailCopy.Template copy, String ctaUrl,
                          String unsubscribeUrl, Map<String, String> params) {
        String app = appName();
        boolean hasCta = ctaUrl != null && !ctaUrl.isBlank() && copy.cta() != null;

        String body = "<p style=\"" + P + "\">" + copy.body() + "</p>";
        if (isMfaCode(params)) {
            body += codeBlock(params.get("code"));
        }

        return """
            <!DOCTYPE html>
            <html lang="%s"><head>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width,initial-scale=1"/>
            <meta name="color-scheme" content="light dark"/>
            <meta name="supported-color-schemes" content="light dark"/>
            <style>
              @media (prefers-color-scheme: dark) {
                .canvas { background:#0d0d0f !important; }
                .card { background:#17171a !important; border-color:#2a2a30 !important; }
                .tx { color:#ededf0 !important; }
                .mut { color:#9a9aa5 !important; }
                .rule { border-color:#2a2a30 !important; }
                .btn { background:#ffffff !important; }
                .btn a { color:#0a0a0a !important; }
                .mark { background:#ffffff !important; color:#0a0a0a !important; }
              }
            </style>
            </head>
            <body style="margin:0;padding:0;background:%s;">
            <span style="display:none;max-height:0;overflow:hidden;opacity:0;">%s</span>
            <table role="presentation" class="canvas" width="100%%" cellpadding="0" cellspacing="0" style="background:%s;">
            <tr><td align="center" style="padding:40px 16px;">
            <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%%;background:%s;border-radius:16px;border:1px solid %s;">
              <tr><td style="padding:32px 36px 0 36px;">%s</td></tr>
              <tr><td style="padding:24px 36px 0 36px;">
                <h1 class="tx" style="margin:0 0 18px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:23px;line-height:1.3;font-weight:700;color:%s;">%s</h1>
                %s
              </td></tr>
              %s
              <tr><td class="rule" style="padding:28px 36px 30px 36px;border-top:1px solid %s;">%s</td></tr>
            </table>
            </td></tr></table>
            </body></html>
            """.formatted(
                lang, CANVAS, copy.preheader(), CANVAS, PAPER, RULE,
                brandMark(app), TEXT, copy.heading(), body,
                hasCta ? ctaRow(lang, ctaUrl, copy.cta()) : "",
                RULE, footer(lang, copy.footerReason(), unsubscribeUrl)
            );
    }

    /** Monogram drawn in HTML so it survives blocked images, which most clients default to. */
    private String brandMark(String app) {
        String logo = emailProps.logoUrl();
        if (logo != null && !logo.isBlank()) {
            return "<img src=\"" + logo + "\" alt=\"" + app + "\" height=\"36\" style=\"display:block;border:0;height:36px;\"/>";
        }
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
            + "<td class=\"mark\" width=\"40\" height=\"40\" align=\"center\" valign=\"middle\" bgcolor=\"" + INK + "\" "
            + "style=\"width:40px;height:40px;border-radius:11px;background:" + INK + ";\">"
            + "<span style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;"
            + "font-size:20px;font-weight:700;color:#ffffff;line-height:40px;\">S</span>"
            + "</td></tr></table>";
    }

    private String ctaRow(String lang, String url, String label) {
        return "<tr><td style=\"padding:8px 36px 0 36px;\">"
            + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
            + "<td class=\"btn\" align=\"center\" bgcolor=\"" + INK + "\" style=\"border-radius:10px;background:" + INK + ";\">"
            + "<a href=\"" + url + "\" target=\"_blank\" style=\"display:inline-block;padding:14px 30px;"
            + "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;"
            + "font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;\">" + label + "</a>"
            + "</td></tr></table>"
            // Some clients strip or rewrite buttons; the raw link keeps the mail usable.
            + "<p class=\"mut\" style=\"margin:18px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;"
            + "font-size:12px;line-height:1.6;color:" + MUTED + ";word-break:break-all;\">"
            + EmailCopy.chrome(lang, "buttonFallback") + "<br/><span style=\"color:" + MUTED + ";\">" + url + "</span></p>"
            + "</td></tr>";
    }

    private String codeBlock(String code) {
        return "<p class=\"tx\" style=\"margin:26px 0;text-align:center;"
            + "font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:700;"
            + "letter-spacing:9px;color:" + TEXT + ";\">" + code + "</p>";
    }

    private String footer(String lang, String reason, String unsubscribeUrl) {
        String app = appName();
        String muted = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;"
            + "font-size:12px;line-height:1.7;color:" + MUTED + ";";
        String web = webUrl();

        StringBuilder links = new StringBuilder();
        if (unsubscribeUrl != null && !unsubscribeUrl.isBlank()) {
            links.append("<a href=\"").append(unsubscribeUrl).append("\" style=\"color:").append(MUTED)
                .append(";text-decoration:underline;\">").append(EmailCopy.chrome(lang, "unsubscribe")).append("</a>")
                .append(" &nbsp;·&nbsp; ")
                .append("<a href=\"").append(web).append("/settings\" style=\"color:").append(MUTED)
                .append(";text-decoration:underline;\">").append(EmailCopy.chrome(lang, "preferences")).append("</a>")
                .append(" &nbsp;·&nbsp; ");
        }
        links.append("<a href=\"").append(web).append("/privacy\" style=\"color:").append(MUTED)
            .append(";text-decoration:underline;\">").append(EmailCopy.chrome(lang, "privacy")).append("</a>")
            .append(" &nbsp;·&nbsp; ")
            .append("<a href=\"").append(web).append("/terms\" style=\"color:").append(MUTED)
            .append(";text-decoration:underline;\">").append(EmailCopy.chrome(lang, "terms")).append("</a>");

        return "<p class=\"mut\" style=\"margin:0 0 10px 0;" + muted + "\">" + reason + "</p>"
            + "<p class=\"mut\" style=\"margin:0 0 14px 0;" + muted + "\">" + links + "</p>"
            + "<p class=\"mut\" style=\"margin:0;" + muted + "\">"
            + EmailCopy.chrome(lang, "disclaimer").replace("{{app}}", app)
            + "<br/>© " + Year.now() + " " + app + "</p>";
    }

    private String plainText(String lang, EmailCopy.Template copy, String ctaUrl, Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        sb.append(copy.heading()).append("\n\n");
        sb.append(copy.body().replaceAll("<br\\s*/?>", "\n").replaceAll("<[^>]+>", "")).append("\n");
        if (isMfaCode(params)) {
            sb.append("\n").append(params.get("code")).append("\n");
        }
        if (ctaUrl != null && !ctaUrl.isBlank() && copy.cta() != null) {
            sb.append("\n").append(copy.cta()).append(": ").append(ctaUrl).append("\n");
        }
        sb.append("\n—\n").append(copy.footerReason()).append("\n");
        sb.append(EmailCopy.chrome(lang, "disclaimer").replace("{{app}}", appName())).append("\n");
        return sb.toString();
    }

    private boolean isMfaCode(Map<String, String> params) {
        return params.get("code") != null && !params.get("code").isBlank();
    }

    private Map<String, String> withDefaults(Map<String, String> params) {
        Map<String, String> merged = new java.util.HashMap<>(params);
        merged.putIfAbsent("app", appName());
        return merged;
    }

    private String appName() {
        return (emailProps.appName() != null && !emailProps.appName().isBlank())
            ? emailProps.appName() : "SocialHan";
    }

    /**
     * Base for the links in the footer.
     *
     * Read from the same FRONTEND_ORIGIN every other link in the app uses.
     * Deriving it from the logo URL — as this once did — pointed the privacy
     * and terms links at the image host the moment the logo was served from a
     * CDN, which is exactly what happened.
     */
    private String webUrl() {
        String origin = env.getProperty("FRONTEND_ORIGIN", "http://localhost:5173");
        return origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin;
    }

    private String apply(String template, Map<String, String> params) {
        String result = template;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue() != null ? entry.getValue() : "");
        }
        return result;
    }
}
