package com.ilhankazan.social.dto.account;

/** Returned when starting authenticator setup: the secret to enter manually and a scannable QR image. */
public record TotpSetupResponse(
    String secret,
    String qrDataUri
) {}
