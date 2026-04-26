package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.account.MyAccountResponse;
import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.account.UpdateProfileRequest;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.manager.AccountManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountManager accountManager;

    @GetMapping("/me")
    public ResponseEntity<MyAccountResponse> getCurrentUser() {
        return ResponseEntity.ok(accountManager.getCurrentUser());
    }

    @GetMapping("/{username}")
    public ResponseEntity<PublicAccountResponse> getAccountProfile(@PathVariable String username) {
        return ResponseEntity.ok(accountManager.getPublicProfile(username));
    }

    @GetMapping("/search")
    public ResponseEntity<PageResponse<PublicAccountResponse>> searchAccounts(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(accountManager.searchAccounts(q, page, size));
    }

    @PatchMapping("/me")
    public ResponseEntity<MyAccountResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(accountManager.updateProfile(request));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<String> updateAvatar(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(accountManager.updateAvatar(file));
    }

    @PostMapping("/me/cover")
    public ResponseEntity<String> updateCover(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(accountManager.updateCover(file));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount() {
        accountManager.deleteAccount();
        return ResponseEntity.noContent().build();
    }
}