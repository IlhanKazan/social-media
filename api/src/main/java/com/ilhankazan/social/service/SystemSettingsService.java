package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.SystemSetting;
import com.ilhankazan.social.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemSettingsService {

    private final SystemSettingRepository systemSettingRepository;

    public static final String REGISTRATION_ENABLED = "registration_enabled";
    public static final String VERIFIED_ONLY_POSTING = "verified_only_posting";
    public static final String MODERATION_ENABLED = "moderation_enabled";
    public static final String BOT_ENABLED = "bot_enabled";
    public static final String READ_ONLY_MODE = "read_only_mode";

    public static final String MOBILE_LATEST_VERSION_CODE = "mobile_latest_version_code";
    public static final String MOBILE_LATEST_VERSION_NAME = "mobile_latest_version_name";
    public static final String MOBILE_MIN_SUPPORTED_VERSION_CODE = "mobile_min_supported_version_code";
    public static final String MOBILE_APK_URL = "mobile_apk_url";
    public static final String MOBILE_APK_SHA256 = "mobile_apk_sha256";
    public static final String MOBILE_CHANGELOG_URL = "mobile_changelog_url";

    @Cacheable(cacheNames = "systemSettings", key = "#key")
    @Transactional(readOnly = true)
    public boolean getBooleanSetting(String key, boolean defaultValue) {
        return systemSettingRepository.findById(key)
            .map(SystemSetting::getValueBool)
            .orElse(defaultValue);
    }

    @CacheEvict(cacheNames = "systemSettings", key = "#key")
    @Transactional
    public void updateBooleanSetting(String key, boolean value, Long adminAccountId) {
        SystemSetting setting = systemSettingRepository.findById(key)
            .orElseGet(() -> SystemSetting.builder().key(key).build());

        setting.setValueBool(value);
        setting.setUpdatedById(adminAccountId);

        systemSettingRepository.save(setting);
        log.info("System setting '{}' updated to '{}' by admin ID: {}", key, value, adminAccountId);
    }

    @Transactional(readOnly = true)
    public List<SystemSetting> getAllSettingsRaw() {
        return systemSettingRepository.findAll();
    }

    @Cacheable(cacheNames = "systemSettings", key = "#key")
    @Transactional(readOnly = true)
    public String getStringSetting(String key, String defaultValue) {
        return systemSettingRepository.findById(key)
            .map(SystemSetting::getValueText)
            .orElse(defaultValue);
    }

    @CacheEvict(cacheNames = "systemSettings", key = "#key")
    @Transactional
    public void updateStringSetting(String key, String value, Long adminAccountId) {
        SystemSetting setting = systemSettingRepository.findById(key)
            .orElseGet(() -> SystemSetting.builder().key(key).build());

        setting.setValueText(value);
        setting.setUpdatedById(adminAccountId);

        systemSettingRepository.save(setting);
        log.info("System setting '{}' updated to '{}' by admin ID: {}", key, value, adminAccountId);
    }
}
