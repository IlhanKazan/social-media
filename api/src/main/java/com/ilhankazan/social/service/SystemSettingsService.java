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
}
