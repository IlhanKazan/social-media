package com.ilhankazan.social.service.email;

import com.ilhankazan.social.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Optional;

/**
 * Signs and verifies the account id carried by an unsubscribe link.
 *
 * A signed value rather than a stored token: the link has to work from an email
 * client with no session, possibly months later, and it must not be guessable
 * from an account id. Signing gets both without a table to expire or clean up.
 *
 * It never expires by design — an opt-out link that has gone stale is worse than
 * useless, because the recipient clicks it, nothing happens, and they report the
 * mail as spam instead. Its only power is to stop optional email, so a leaked
 * link cannot do harm beyond that.
 */
@Service
@RequiredArgsConstructor
public class UnsubscribeTokenService {

    private static final String ALGORITHM = "HmacSHA256";

    private final AppProperties.JwtProperties jwtProps;

    public String sign(Long accountId) {
        String payload = String.valueOf(accountId);
        String signature = hmac(payload);
        return base64(payload) + "." + signature;
    }

    public Optional<Long> verify(String token) {
        if (token == null || !token.contains(".")) return Optional.empty();

        int dot = token.lastIndexOf('.');
        String encodedPayload = token.substring(0, dot);
        String signature = token.substring(dot + 1);

        String payload;
        try {
            payload = new String(Base64.getUrlDecoder().decode(encodedPayload), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }

        // Constant-time: a byte-by-byte early exit would leak the signature one
        // character at a time to anyone willing to time the endpoint.
        if (!MessageDigest.isEqual(
                hmac(payload).getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8))) {
            return Optional.empty();
        }

        try {
            return Optional.of(Long.parseLong(payload));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private String hmac(String payload) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(jwtProps.secret().getBytes(StandardCharsets.UTF_8), ALGORITHM));
            return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Cannot sign unsubscribe token", e);
        }
    }

    private String base64(String value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }
}
