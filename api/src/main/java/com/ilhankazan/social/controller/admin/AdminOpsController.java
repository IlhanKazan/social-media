package com.ilhankazan.social.controller.admin;

import com.ilhankazan.social.manager.AdminOpsManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/ops")
@RequiredArgsConstructor
public class AdminOpsController {

    private final AdminOpsManager adminOpsManager;

    @GetMapping("/caches")
    public ResponseEntity<Collection<String>> listCaches() {
        return ResponseEntity.ok(adminOpsManager.listCaches());
    }

    @PostMapping("/caches/invalidate")
    public ResponseEntity<Void> invalidateCache(@RequestBody(required = false) Map<String, String> request) {
        adminOpsManager.invalidateCache(request != null ? request.get("name") : null);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/rate-limits/reset")
    public ResponseEntity<Void> resetRateLimits() {
        adminOpsManager.resetRateLimits();
        return ResponseEntity.noContent().build();
    }
}
