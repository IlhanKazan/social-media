package com.ilhankazan.social.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecretCipherTest {

    // 32-byte key, base64.
    private final SecretCipher cipher = new SecretCipher("MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=");

    @Test
    void encryptDecryptRoundTrip() {
        String secret = "JBSWY3DPEHPK3PXP";
        String encrypted = cipher.encrypt(secret);
        assertThat(encrypted).isNotEqualTo(secret);
        assertThat(cipher.decrypt(encrypted)).isEqualTo(secret);
    }

    @Test
    void differentCiphertextsForSameInput() {
        assertThat(cipher.encrypt("same")).isNotEqualTo(cipher.encrypt("same"));
    }

    @Test
    void rejectsWrongKeyLength() {
        assertThatThrownBy(() -> new SecretCipher("c2hvcnQ=")).isInstanceOf(IllegalStateException.class);
    }
}
