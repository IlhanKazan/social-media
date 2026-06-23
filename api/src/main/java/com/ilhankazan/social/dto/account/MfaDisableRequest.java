package com.ilhankazan.social.dto.account;

import jakarta.validation.constraints.NotBlank;

public record MfaDisableRequest(
    @NotBlank(message = "Password is required") String password
) {}
