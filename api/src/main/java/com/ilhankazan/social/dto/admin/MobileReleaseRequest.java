package com.ilhankazan.social.dto.admin;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MobileReleaseRequest(
    @NotNull @Min(1) Integer latestVersionCode,
    @NotBlank String latestVersionName,
    @NotNull @Min(1) Integer minSupportedVersionCode,
    @NotBlank String apkUrl,
    String changelogUrl
) {}
