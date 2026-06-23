package com.ilhankazan.social.service;

import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.exceptions.CodeGenerationException;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import dev.samstevens.totp.util.Utils;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@Service
public class TotpService {

    private static final int PERIOD_SECONDS = 30;
    private static final int DIGITS = 6;
    private static final String ISSUER = "SocialHan";

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final CodeGenerator codeGenerator = new DefaultCodeGenerator();
    private final TimeProvider timeProvider = new SystemTimeProvider();

    public String generateSecret() {
        return secretGenerator.generate();
    }

    public String qrDataUri(String accountEmail, String secret) {
        QrData data = new QrData.Builder()
            .label(accountEmail)
            .secret(secret)
            .issuer(ISSUER)
            .algorithm(HashingAlgorithm.SHA1)
            .digits(DIGITS)
            .period(PERIOD_SECONDS)
            .build();
        try {
            QrGenerator generator = new ZxingPngQrGenerator();
            byte[] image = generator.generate(data);
            return Utils.getDataUriForImage(image, generator.getImageMimeType());
        } catch (QrGenerationException e) {
            throw new IllegalStateException("Failed to generate QR code", e);
        }
    }

    /**
     * Validates {@code code} against {@code secret} with a +/-1 step window, rejecting replays.
     * Returns the matched time step (to persist for replay protection), or -1 if invalid/replayed.
     */
    public long verifyAndGetStep(String secret, String code, long lastUsedStep) {
        long currentStep = Math.floorDiv(timeProvider.getTime(), PERIOD_SECONDS);
        for (long step = currentStep - 1; step <= currentStep + 1; step++) {
            try {
                if (constantTimeEquals(codeGenerator.generate(secret, step), code) && step > lastUsedStep) {
                    return step;
                }
            } catch (CodeGenerationException ignored) {
                // skip this step
            }
        }
        return -1;
    }

    private boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
            a.getBytes(StandardCharsets.UTF_8),
            b.getBytes(StandardCharsets.UTF_8));
    }
}
