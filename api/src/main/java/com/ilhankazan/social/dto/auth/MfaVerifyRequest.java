package com.ilhankazan.social.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record MfaVerifyRequest(
    @NotBlank(message = "MFA session token is required") String mfaToken,
    @NotBlank(message = "Method is required") String method,
    @NotBlank(message = "Code is required") String code
) {}
