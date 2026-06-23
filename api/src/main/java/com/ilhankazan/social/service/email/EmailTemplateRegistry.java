package com.ilhankazan.social.service.email;

import com.ilhankazan.social.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Year;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class EmailTemplateRegistry {

    private final AppProperties.EmailProperties emailProps;

    private static final String BRAND = "#4f46e5";
    private static final String BG = "#f4f4f7";
    private static final String P = "margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2933;";
    private static final String P_MUTED = "margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6b7280;";

    public String renderHtml(String templateName, Map<String, String> params) {
        String app = appName();
        String html = switch (templateName) {
            case "WELCOME" -> layout(
                "Welcome to " + app + " — start sharing.",
                "Welcome to " + app + ", {{name}} 👋",
                "<p style=\"" + P + "\">Thanks for joining " + app + ". Your account is ready — jump in and share your first thought with the community.</p>",
                "Start posting", "{{link}}"
            );
            case "PASSWORD_RESET" -> layout(
                "Reset your " + app + " password.",
                "Reset your password",
                "<p style=\"" + P + "\">We received a request to reset your password. Click the button below to choose a new one. This link expires in 30 minutes.</p>"
                    + "<p style=\"" + P_MUTED + "\">If you didn't request this, you can safely ignore this email — your password won't change.</p>",
                "Reset password", "{{resetLink}}"
            );
            case "EMAIL_VERIFICATION" -> layout(
                "Verify your " + app + " email.",
                "Verify your email",
                "<p style=\"" + P + "\">Confirm your email address to secure your " + app + " account and unlock the verified badge.</p>",
                "Verify email", "{{verifyLink}}"
            );
            case "ADMIN_ALERT" -> layout(
                "{{title}}",
                "{{title}}",
                "<p style=\"" + P + "\">{{message}}</p>",
                null, null
            );
            case "MFA_CODE" -> layout(
                "Your " + app + " verification code.",
                "Your verification code",
                "<p style=\"" + P + "\">Use this code to finish signing in. It expires in {{minutes}} minutes.</p>"
                    + "<p style=\"font:600 32px/1.2 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:6px;margin:24px 0;text-align:center\">{{code}}</p>"
                    + "<p style=\"" + P_MUTED + "\">If you didn't try to sign in, change your password — someone may know it.</p>",
                null, null
            );
            default -> layout(app, app, "<p style=\"" + P + "\">{{message}}</p>", null, null);
        };
        return applyParams(html, params);
    }

    public String renderText(String templateName, Map<String, String> params) {
        String app = appName();
        String text = switch (templateName) {
            case "WELCOME" -> "Welcome to " + app + ", {{name}}!\n\nThanks for joining " + app + ". Share your first thought: {{link}}\n\n— The " + app + " team";
            case "PASSWORD_RESET" -> "Reset your " + app + " password\n\nWe received a request to reset your password. Open this link to choose a new one (expires in 30 minutes):\n{{resetLink}}\n\nIf you didn't request this, ignore this email — your password won't change.";
            case "EMAIL_VERIFICATION" -> "Verify your " + app + " email\n\nConfirm your email address:\n{{verifyLink}}";
            case "ADMIN_ALERT" -> "{{title}}\n\n{{message}}";
            case "MFA_CODE" -> "Your " + app + " verification code: {{code}}\n\nIt expires in {{minutes}} minutes. If you didn't try to sign in, change your password.";
            default -> "{{message}}";
        };
        return applyParams(text, params);
    }

    private String layout(String preheader, String heading, String bodyHtml, String ctaLabel, String ctaUrl) {
        String app = appName();
        String logo = (emailProps.logoUrl() != null && !emailProps.logoUrl().isBlank())
            ? "<img src=\"" + emailProps.logoUrl() + "\" alt=\"" + app + "\" height=\"40\" style=\"display:block;border:0;height:40px;max-height:40px;\" />"
            : "<span style=\"font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:" + BRAND + ";\">" + app + "</span>";
        String cta = (ctaLabel != null && ctaUrl != null) ? button(ctaUrl, ctaLabel) : "";

        return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/>"
            + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>"
            + "<meta name=\"color-scheme\" content=\"light only\"/>"
            + "<title>" + app + "</title></head>"
            + "<body style=\"margin:0;padding:0;background:" + BG + ";\">"
            + "<span style=\"display:none;max-height:0;overflow:hidden;opacity:0;\">" + preheader + "</span>"
            + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:" + BG + ";\">"
            + "<tr><td align=\"center\" style=\"padding:32px 16px;\">"
            + "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #ececf1;\">"
            + "<tr><td align=\"center\" style=\"padding:28px 32px 4px 32px;\">" + logo + "</td></tr>"
            + "<tr><td style=\"padding:8px 32px 8px 32px;\">"
            + "<h1 style=\"margin:16px 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:#1f2933;\">" + heading + "</h1>"
            + bodyHtml
            + (cta.isEmpty() ? "" : "<div style=\"padding:10px 0 6px 0;\">" + cta + "</div>")
            + "</td></tr>"
            + "<tr><td style=\"padding:24px 32px 28px 32px;border-top:1px solid #f0f0f4;\">"
            + "<p style=\"margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9aa0aa;\">"
            + "You're receiving this email because you have an account on " + app + ".<br/>"
            + "© " + Year.now() + " " + app + ". All rights reserved.</p>"
            + "</td></tr>"
            + "</table></td></tr></table></body></html>";
    }

    private String button(String url, String label) {
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
            + "<td align=\"center\" bgcolor=\"" + BRAND + "\" style=\"border-radius:10px;\">"
            + "<a href=\"" + url + "\" target=\"_blank\" style=\"display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;\">"
            + label + "</a></td></tr></table>";
    }

    private String appName() {
        return (emailProps.appName() != null && !emailProps.appName().isBlank()) ? emailProps.appName() : "SocialHan";
    }

    private String applyParams(String template, Map<String, String> params) {
        String result = template;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue() != null ? entry.getValue() : "");
        }
        return result;
    }
}
