package com.ilhankazan.social.dto.account;

import jakarta.validation.constraints.NotBlank;

public record MfaEnableRequest(
    @NotBlank(message = "Code is required") String code
) {}
