package com.ilhankazan.social.dto.admin;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MobileReleaseRequest(
    @NotNull @Min(1) @Max(2_100_000_000) Integer latestVersionCode,
    @NotBlank @Size(max = 32) String latestVersionName,
    @NotNull @Min(1) @Max(2_100_000_000) Integer minSupportedVersionCode,

    // Pinned to release assets under this project's own GitHub account, so a
    // compromised admin session can't point the public download page (or the
    // in-app update prompt) at an arbitrary off-host payload, a javascript:/
    // data:/intent: URL, or a non-APK file. The owner segment is
    // case-insensitive because GitHub resolves it that way regardless.
    @NotBlank @Size(max = 512)
    @Pattern(
        regexp = "^https://github\\.com/(?i:ilhankazan)/[A-Za-z0-9._-]{1,64}"
            + "/releases/download/[A-Za-z0-9._-]{1,64}/[A-Za-z0-9][A-Za-z0-9._-]*\\.apk$",
        message = "Must be an https GitHub release asset URL: "
            + "https://github.com/IlhanKazan/<repo>/releases/download/<tag>/<file>.apk")
    String apkUrl,

    @NotBlank @Pattern(regexp = "^[a-fA-F0-9]{64}$", message = "Must be a 64-character hex SHA-256 checksum")
    String apkSha256,

    @Size(max = 512)
    @Pattern(regexp = "^$|^https://.{1,500}$", message = "Must be an https URL")
    String changelogUrl
) {}
