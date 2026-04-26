package com.ilhankazan.social.dto.account;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(max = 50, message = "Display name cannot exceed 50 characters")
    String displayName,
    
    @Size(max = 160, message = "Bio cannot exceed 160 characters")
    String bio
) {}
