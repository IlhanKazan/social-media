package com.ilhankazan.social.controller.admin;

import com.ilhankazan.social.dto.admin.AdminUserDetailResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.entity.AuditLog;
import com.ilhankazan.social.manager.AdminAuditManager;
import com.ilhankazan.social.manager.AdminSystemManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/settings")
@RequiredArgsConstructor
public class AdminSystemSettingsController {

    private final AdminSystemManager adminSystemManager;
    private final AdminAuditManager adminAuditManager;

    @GetMapping
    public ResponseEntity<Map<String, Boolean>> getAllSettings() {
        return ResponseEntity.ok(adminSystemManager.getAllSettings());
    }

    @PatchMapping("/{key}")
    public ResponseEntity<Void> updateSetting(@PathVariable String key, @RequestBody Map<String, Boolean> request) {
        Boolean value = request.get("value");
        if (value == null) {
            throw new IllegalArgumentException("Value field is required");
        }
        adminSystemManager.updateSetting(key, value);
        return ResponseEntity.ok().build();
    }
}
