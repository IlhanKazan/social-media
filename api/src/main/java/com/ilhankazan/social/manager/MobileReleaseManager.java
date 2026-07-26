package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.admin.MobileReleaseRequest;
import com.ilhankazan.social.dto.mobile.MobileVersionResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.AuditLogService;
import com.ilhankazan.social.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class MobileReleaseManager {

    private final SystemSettingsService systemSettingsService;
    private final AccountService accountService;
    private final AuditLogService auditLogService;

    private Account getCurrentAdmin() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username);
    }

    public MobileVersionResponse getCurrentRelease() {
        int latestVersionCode = parseIntSafe(
            systemSettingsService.getStringSetting(SystemSettingsService.MOBILE_LATEST_VERSION_CODE, null));
        String latestVersionName = systemSettingsService.getStringSetting(
            SystemSettingsService.MOBILE_LATEST_VERSION_NAME, "");
        int minSupportedVersionCode = parseIntSafe(
            systemSettingsService.getStringSetting(SystemSettingsService.MOBILE_MIN_SUPPORTED_VERSION_CODE, null));
        String apkUrl = systemSettingsService.getStringSetting(SystemSettingsService.MOBILE_APK_URL, "");
        String apkSha256 = systemSettingsService.getStringSetting(SystemSettingsService.MOBILE_APK_SHA256, "");
        String changelogUrl = systemSettingsService.getStringSetting(SystemSettingsService.MOBILE_CHANGELOG_URL, "");

        return new MobileVersionResponse(
            latestVersionCode, latestVersionName, minSupportedVersionCode, apkUrl, apkSha256, changelogUrl);
    }

    @Transactional
    public void updateRelease(MobileReleaseRequest request) {
        Account admin = getCurrentAdmin();
        Long adminId = admin.getId();

        systemSettingsService.updateStringSetting(
            SystemSettingsService.MOBILE_LATEST_VERSION_CODE, String.valueOf(request.latestVersionCode()), adminId);
        systemSettingsService.updateStringSetting(
            SystemSettingsService.MOBILE_LATEST_VERSION_NAME, request.latestVersionName(), adminId);
        systemSettingsService.updateStringSetting(
            SystemSettingsService.MOBILE_MIN_SUPPORTED_VERSION_CODE, String.valueOf(request.minSupportedVersionCode()), adminId);
        systemSettingsService.updateStringSetting(
            SystemSettingsService.MOBILE_APK_URL, request.apkUrl(), adminId);
        systemSettingsService.updateStringSetting(
            SystemSettingsService.MOBILE_APK_SHA256, request.apkSha256().toLowerCase(), adminId);
        systemSettingsService.updateStringSetting(
            SystemSettingsService.MOBILE_CHANGELOG_URL, request.changelogUrl(), adminId);

        auditLogService.record("MOBILE_RELEASE_UPDATED", "SYSTEM", null, Map.of(
            "latestVersionCode", request.latestVersionCode(),
            "latestVersionName", request.latestVersionName(),
            "minSupportedVersionCode", request.minSupportedVersionCode()
        ));
    }

    private static int parseIntSafe(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
