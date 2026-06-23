package com.ilhankazan.social.service;

import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TotpServiceTest {

    private final TotpService service = new TotpService();

    @Test
    void acceptsCurrentCodeRejectsReplayAndWrongCode() throws Exception {
        String secret = service.generateSecret();
        long step = Math.floorDiv(new SystemTimeProvider().getTime(), 30);
        String code = new DefaultCodeGenerator().generate(secret, step);

        long matched = service.verifyAndGetStep(secret, code, -1);
        assertThat(matched).isEqualTo(step);

        // Same step already consumed -> replay rejected.
        assertThat(service.verifyAndGetStep(secret, code, matched)).isEqualTo(-1);

        // Wrong code rejected.
        assertThat(service.verifyAndGetStep(secret, "000000", -1)).isEqualTo(-1);
    }

    @Test
    void qrDataUriIsAPngDataUri() {
        String secret = service.generateSecret();
        assertThat(service.qrDataUri("user@example.com", secret)).startsWith("data:image/png;base64,");
    }
}
