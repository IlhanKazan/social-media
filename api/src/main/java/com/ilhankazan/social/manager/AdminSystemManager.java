package com.ilhankazan.social.manager;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.SystemSetting;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.AuditLogService;
import com.ilhankazan.social.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class AdminSystemManager {

    private final SystemSettingsService systemSettingsService;
    private final AccountService accountService;
    private final AuditLogService auditLogService;

    private Account getCurrentAdmin() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username);
    }

    public Map<String, Boolean> getAllSettings() {
        Map<String, Boolean> settings = systemSettingsService.getAllSettingsRaw().stream()
            .filter(s -> s.getValueBool() != null)
            .collect(Collectors.toMap(SystemSetting::getKey, SystemSetting::getValueBool));

        settings.putIfAbsent(SystemSettingsService.REGISTRATION_ENABLED, true);
        settings.putIfAbsent(SystemSettingsService.VERIFIED_ONLY_POSTING, false);
        settings.putIfAbsent(SystemSettingsService.MODERATION_ENABLED, true);
        settings.putIfAbsent(SystemSettingsService.BOT_ENABLED, false);

        return settings;
    }

    public void updateSetting(String key, Boolean value) {
        Account admin = getCurrentAdmin();
        systemSettingsService.updateBooleanSetting(key, value, admin.getId());

        auditLogService.record("SETTING_CHANGED", "SYSTEM", null, Map.of("key", key, "new_value", value));
    }
}
