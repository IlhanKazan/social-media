package com.ilhankazan.social.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Payload to request a new access token")
public record RefreshRequest(
    @Schema(description = "The valid refresh token obtained during login", example = "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6")
    @NotBlank(message = "Refresh token is required")
    String refreshToken
) {}
