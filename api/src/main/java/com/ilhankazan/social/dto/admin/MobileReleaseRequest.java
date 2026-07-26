package com.ilhankazan.social.dto.admin;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record MobileReleaseRequest(
    @NotNull @Min(1) Integer latestVersionCode,
    @NotBlank String latestVersionName,
    @NotNull @Min(1) Integer minSupportedVersionCode,
    @NotBlank String apkUrl,
    @NotBlank @Pattern(regexp = "^[a-fA-F0-9]{64}$", message = "Must be a 64-character hex SHA-256 checksum")
    String apkSha256,
    String changelogUrl
) {}
