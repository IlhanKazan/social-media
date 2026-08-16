package com.ilhankazan.social.controller;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.security.RateLimit;
import com.ilhankazan.social.service.email.UnsubscribeTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Optional;

/**
 * Honours the unsubscribe link carried by notification email.
 *
 * Public by necessity: the recipient clicks it from a mail client with no
 * session, and requiring a login to stop unwanted email is exactly the friction
 * that gets a sender marked as spam instead. The signed token is the credential.
 *
 * Both verbs exist on purpose. GET is the human clicking the footer link and
 * gets a page back; POST is RFC 8058 one-click, which Gmail and Yahoo call
 * directly from their own UI and expect to succeed without a redirect or a
 * confirmation step.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/email")
@RequiredArgsConstructor
public class EmailPreferencesController {

    private final UnsubscribeTokenService tokenService;
    private final AccountRepository accountRepository;

    @RateLimit(capacity = 30, minutes = 60)
    @GetMapping(value = "/unsubscribe", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> unsubscribeFromLink(@RequestParam String token) {
        Optional<Account> account = apply(token);
        // The same page either way: telling an anonymous caller whether a token
        // matched a real account would turn this into an account oracle.
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(page(account.map(a -> languageOf(a)).orElse("tr")));
    }

    @RateLimit(capacity = 30, minutes = 60)
    @PostMapping("/unsubscribe")
    public ResponseEntity<Void> unsubscribeOneClick(@RequestParam String token) {
        apply(token);
        return ResponseEntity.ok().build();
    }

    @Transactional
    protected Optional<Account> apply(String token) {
        Optional<Long> accountId = tokenService.verify(token);
        if (accountId.isEmpty()) {
            return Optional.empty();
        }

        return accountRepository.findById(accountId.get()).map(account -> {
            if (account.isEmailNotificationsEnabled()) {
                account.setEmailNotificationsEnabled(false);
                account.setEmailUnsubscribedAt(Instant.now());
                accountRepository.save(account);
                log.info("Account {} unsubscribed from notification email", account.getId());
            }
            return account;
        });
    }

    private String languageOf(Account account) {
        return "en".equalsIgnoreCase(account.getPreferredLanguage()) ? "en" : "tr";
    }

    private String page(String lang) {
        boolean tr = !"en".equals(lang);
        String title = tr ? "Aboneliğin durduruldu" : "You have been unsubscribed";
        String body = tr
            ? "Bildirim e-postaları artık gönderilmeyecek. Hesap güvenliğiyle ilgili e-postalar (şifre sıfırlama, giriş kodu) gönderilmeye devam eder."
            : "You will no longer receive notification emails. Emails about account security — password resets and sign-in codes — will still be sent.";
        String back = tr ? "Ayarlara dön" : "Back to settings";

        return """
            <!doctype html><html lang="%s"><head><meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width,initial-scale=1"/>
            <title>%s</title></head>
            <body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f2f2f4;">
            <div style="max-width:520px;margin:16vh auto;padding:36px;background:#fff;border-radius:16px;border:1px solid #e6e6ea;">
              <h1 style="margin:0 0 12px;font-size:22px;color:#18181b;">%s</h1>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#52525b;">%s</p>
              <a href="/settings" style="display:inline-block;padding:12px 22px;background:#0a0a0a;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">%s</a>
            </div></body></html>
            """.formatted(lang, title, title, body, back);
    }
}
