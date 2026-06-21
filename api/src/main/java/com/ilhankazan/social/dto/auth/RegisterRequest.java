package com.ilhankazan.social.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Request payload for user registration")
public record RegisterRequest(
    @Schema(description = "Unique username", example = "ilhankazan")
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
    String username,

    @Schema(description = "Valid email address", example = "ilhan@example.com")
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    String email,

    @Schema(description = "Strong password", example = "P@ssw0rd123!")
    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
    String password,

    @Schema(description = "Public display name", example = "İlhan Kazan")
    @Size(max = 50, message = "Display name cannot exceed 50 characters")
    String displayName,

    @Schema(description = "User accepted the Terms of Service and Privacy Policy", example = "true")
    @AssertTrue(message = "You must accept the Terms and Privacy Policy")
    boolean acceptedTerms,

    @Schema(description = "User confirmed they meet the minimum age requirement", example = "true")
    @AssertTrue(message = "You must confirm you meet the minimum age requirement")
    boolean confirmedAge
) {}
