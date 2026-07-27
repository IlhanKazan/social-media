package com.ilhankazan.social.dto.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateLanguageRequest(
    @NotBlank
    @Pattern(regexp = "en|tr", message = "Language must be 'en' or 'tr'")
    String language
) {}
