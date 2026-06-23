package com.ilhankazan.social.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record MfaResendRequest(
    @NotBlank(message = "MFA session token is required") String mfaToken
) {}
