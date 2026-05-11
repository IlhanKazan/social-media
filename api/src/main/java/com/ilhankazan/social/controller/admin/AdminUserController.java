package com.ilhankazan.social.controller.admin;

import com.ilhankazan.social.dto.admin.AdminAccountResponse;
import com.ilhankazan.social.dto.admin.AdminUserDetailResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.manager.AdminUserManager;
import com.ilhankazan.social.security.RateLimit;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserManager adminUserManager;

    @GetMapping
    public ResponseEntity<PageResponse<AdminAccountResponse>> getUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String search,
        @RequestParam(required = false, defaultValue = "all") String status,
        @RequestParam(required = false) Boolean verified,
        @RequestParam(required = false) String role) {
        return ResponseEntity.ok(adminUserManager.getUsers(page, size, search, status, verified, role));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminUserDetailResponse> getUserDetail(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserManager.getUserDetail(id));
    }

    @RateLimit(capacity = 20)
    @PostMapping("/{id}/ban")
    public ResponseEntity<Void> banUser(@PathVariable Long id, @RequestBody Map<String, String> body) {
        adminUserManager.banUser(id, body.getOrDefault("reason", "No reason provided"));
        return ResponseEntity.noContent().build();
    }

    @RateLimit(capacity = 20)
    @PostMapping("/{id}/unban")
    public ResponseEntity<Void> unbanUser(@PathVariable Long id) {
        adminUserManager.unbanUser(id);
        return ResponseEntity.noContent().build();
    }

    @RateLimit(capacity = 20)
    @PostMapping("/{id}/force-logout")
    public ResponseEntity<Void> forceLogout(@PathVariable Long id) {
        adminUserManager.forceLogout(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(@PathVariable Long id) {
        adminUserManager.resetPassword(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/promote")
    public ResponseEntity<Void> promoteUser(@PathVariable Long id) {
        adminUserManager.promoteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/demote")
    public ResponseEntity<Void> demoteUser(@PathVariable Long id) {
        adminUserManager.demoteUser(id);
        return ResponseEntity.noContent().build();
    }
}
