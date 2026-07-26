package com.ilhankazan.social.dto.mobile;

public record MobileVersionResponse(
    int latestVersionCode,
    String latestVersionName,
    int minSupportedVersionCode,
    String apkUrl,
    String changelogUrl
) {}
