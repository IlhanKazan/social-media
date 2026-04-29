package com.ilhankazan.social.dto.account;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "Request payload to update user profile details")
public record UpdateProfileRequest(
    @Schema(description = "New display name", example = "Dev İlhan")
    @Size(max = 50, message = "Display name cannot exceed 50 characters")
    String displayName,

    @Schema(description = "New bio", example = "Building real-time event-driven systems with Spring Boot & Go.")
    @Size(max = 160, message = "Bio cannot exceed 160 characters")
    String bio
) {}
