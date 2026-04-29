package com.ilhankazan.social.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Request payload for user login")
public record LoginRequest(
    @Schema(description = "User's registered username or email", example = "ilhankazan")
    @NotBlank(message = "Username or Email is required")
    String identifier,

    @Schema(description = "User's password", example = "P@ssw0rd123!")
    @NotBlank(message = "Password is required")
    String password
) {}
