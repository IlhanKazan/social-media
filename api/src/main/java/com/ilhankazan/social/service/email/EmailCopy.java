package com.ilhankazan.social.service.email;

import java.util.Map;

/**
 * Wording for every template, in each supported language.
 *
 * Kept as data rather than folded into the renderer so the two concerns stay
 * separable: adding a language is a map entry, and changing the layout never
 * touches a sentence. Turkish is the fallback because it is the app's original,
 * always-complete language — the same rule the clients use.
 */
final class EmailCopy {

    private EmailCopy() {}

    record Template(
        String subject,
        String preheader,
        String heading,
        String body,
        String cta,
        String footerReason
    ) {}

    private static final Map<String, Map<String, Template>> COPY = Map.of(
        "tr", Map.of(
            "WELCOME", new Template(
                "{{app}}'a hoş geldin",
                "Hesabın hazır — ilk gönderini paylaş.",
                "Hoş geldin, {{name}}",
                "Hesabın hazır. Akışa göz at, birini takip et, aklından geçeni yaz. Burada algoritma yok — ne takip edersen onu görürsün.",
                "Akışa git",
                "Bu e-postayı {{app}}'a kaydolduğun için aldın."
            ),
            "PASSWORD_RESET", new Template(
                "Şifreni sıfırla",
                "Şifre sıfırlama bağlantın 30 dakika geçerli.",
                "Şifreni sıfırla",
                "Şifreni sıfırlamak için bir istek aldık. Aşağıdaki düğmeyle yeni bir şifre belirleyebilirsin. Bağlantı <strong>30 dakika</strong> sonra geçersiz olur.<br><br>Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin — şifren değişmez.",
                "Yeni şifre belirle",
                "Bu e-postayı hesap güvenliğin için aldın."
            ),
            "EMAIL_VERIFICATION", new Template(
                "E-posta adresini doğrula",
                "Tek tıkla doğrula, mavi tiki al.",
                "E-posta adresini doğrula",
                "Adresini doğrulayınca hesabın güvenceye alınır ve profilinde doğrulanmış rozeti görünür.",
                "Adresimi doğrula",
                "Bu e-postayı hesap doğrulaması için aldın."
            ),
            "MFA_CODE", new Template(
                "Giriş kodun: {{code}}",
                "Kodun {{minutes}} dakika geçerli.",
                "Giriş kodun",
                "Girişi tamamlamak için bu kodu kullan. <strong>{{minutes}} dakika</strong> sonra geçersiz olur.<br><br>Giriş yapmayı sen denemediysen şifreni değiştir — birisi biliyor olabilir.",
                null,
                "Bu e-postayı iki adımlı doğrulama açık olduğu için aldın."
            ),
            "NOTIFICATION_DIGEST", new Template(
                "{{app}}'da neler oldu",
                "Yokken olan biten.",
                "Yokken neler oldu",
                "{{message}}",
                "Akışa git",
                "Bu e-postayı bildirim tercihlerinde e-posta özeti açık olduğu için aldın."
            ),
            "ADMIN_ALERT", new Template(
                "{{title}}",
                "{{title}}",
                "{{title}}",
                "{{message}}",
                null,
                "Bu e-postayı yönetici olduğun için aldın."
            )
        ),
        "en", Map.of(
            "WELCOME", new Template(
                "Welcome to {{app}}",
                "Your account is ready — share your first post.",
                "Welcome, {{name}}",
                "Your account is ready. Look around the feed, follow someone, write what is on your mind. There is no algorithm here — you see what you follow.",
                "Go to the feed",
                "You are receiving this because you signed up for {{app}}."
            ),
            "PASSWORD_RESET", new Template(
                "Reset your password",
                "Your reset link is valid for 30 minutes.",
                "Reset your password",
                "We received a request to reset your password. Use the button below to choose a new one. The link expires in <strong>30 minutes</strong>.<br><br>If you did not request this, you can ignore this email — your password will not change.",
                "Choose a new password",
                "You are receiving this for the security of your account."
            ),
            "EMAIL_VERIFICATION", new Template(
                "Verify your email address",
                "One click to verify and get the badge.",
                "Verify your email address",
                "Verifying your address secures your account and adds the verified badge to your profile.",
                "Verify my address",
                "You are receiving this to verify your account."
            ),
            "MFA_CODE", new Template(
                "Your sign-in code: {{code}}",
                "Your code is valid for {{minutes}} minutes.",
                "Your sign-in code",
                "Use this code to finish signing in. It expires in <strong>{{minutes}} minutes</strong>.<br><br>If you did not try to sign in, change your password — somebody may know it.",
                null,
                "You are receiving this because two-factor authentication is enabled."
            ),
            "NOTIFICATION_DIGEST", new Template(
                "What happened on {{app}}",
                "What you missed.",
                "What you missed",
                "{{message}}",
                "Go to the feed",
                "You are receiving this because email digests are enabled in your notification preferences."
            ),
            "ADMIN_ALERT", new Template(
                "{{title}}",
                "{{title}}",
                "{{title}}",
                "{{message}}",
                null,
                "You are receiving this because you are an administrator."
            )
        )
    );

    private static final Map<String, Map<String, String>> CHROME = Map.of(
        "tr", Map.of(
            "unsubscribe", "Bu e-postaları almayı bırak",
            "preferences", "Bildirim tercihleri",
            "privacy", "Gizlilik",
            "terms", "Şartlar",
            "buttonFallback", "Düğme çalışmıyorsa bu adresi tarayıcına yapıştır:",
            "disclaimer", "{{app}} bir portfolyo projesidir, ticari bir hizmet değildir."
        ),
        "en", Map.of(
            "unsubscribe", "Stop receiving these emails",
            "preferences", "Notification preferences",
            "privacy", "Privacy",
            "terms", "Terms",
            "buttonFallback", "If the button does not work, paste this address into your browser:",
            "disclaimer", "{{app}} is a portfolio project, not a commercial service."
        )
    );

    static Template template(String language, String name) {
        Map<String, Template> byName = COPY.getOrDefault(normalise(language), COPY.get("tr"));
        Template found = byName.get(name);
        if (found != null) return found;
        // Unknown template: still produce something addressed to a person rather
        // than failing a queued send.
        return new Template("{{app}}", "{{app}}", "{{app}}", "{{message}}", null, "");
    }

    static String chrome(String language, String key) {
        return CHROME.getOrDefault(normalise(language), CHROME.get("tr")).getOrDefault(key, "");
    }

    static String normalise(String language) {
        if (language == null) return "tr";
        String lower = language.toLowerCase();
        return CHROME.containsKey(lower) ? lower : "tr";
    }
}
