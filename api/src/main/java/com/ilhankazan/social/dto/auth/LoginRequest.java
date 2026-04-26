package com.ilhankazan.social.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank(message = "Username or Email is required")
    String identifier,

    @NotBlank(message = "Password is required")
    String password
) {}
