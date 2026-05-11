package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.account.ChangePasswordRequest;
import com.ilhankazan.social.dto.account.MyAccountResponse;
import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.account.UpdateProfileRequest;
import com.ilhankazan.social.dto.auth.VerifyEmailRequest;
import com.ilhankazan.social.manager.AccountManager;
import com.ilhankazan.social.security.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
@Validated
@Tag(name = "Accounts", description = "Endpoints for user profile and account management")
public class AccountController {

    private final AccountManager accountManager;

    @Operation(summary = "Get current user profile", description = "Returns full profile details of the authenticated user.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved profile")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @GetMapping("/me")
    public ResponseEntity<MyAccountResponse> getCurrentUser() {
        return ResponseEntity.ok(accountManager.getCurrentUser());
    }

    @Operation(summary = "Get public profile", description = "Returns public details of a user by their username.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved profile")
    @ApiResponse(responseCode = "404", description = "User not found")
    @GetMapping("/{username}")
    public ResponseEntity<PublicAccountResponse> getAccountProfile(@PathVariable String username) {
        return ResponseEntity.ok(accountManager.getPublicProfile(username));
    }

    @Operation(summary = "Update profile details", description = "Updates display name and/or bio.")
    @ApiResponse(responseCode = "200", description = "Profile successfully updated")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @PatchMapping("/me")
    public ResponseEntity<MyAccountResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(accountManager.updateProfile(request));
    }

    @Operation(summary = "Update avatar", description = "Uploads and updates the user's profile image.")
    @ApiResponse(responseCode = "200", description = "Avatar successfully updated")
    @ApiResponse(responseCode = "400", description = "Invalid file type or size")
    @RateLimit(capacity = 10, minutes = 60)
    @PostMapping("/me/avatar")
    public ResponseEntity<String> updateAvatar(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(accountManager.updateAvatar(file));
    }

    @Operation(summary = "Update cover image", description = "Uploads and updates the user's cover image.")
    @ApiResponse(responseCode = "200", description = "Cover image successfully updated")
    @ApiResponse(responseCode = "400", description = "Invalid file type or size")
    @RateLimit(capacity = 10, minutes = 60)
    @PostMapping("/me/cover")
    public ResponseEntity<String> updateCover(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(accountManager.updateCover(file));
    }

    @Operation(summary = "Delete account", description = "Soft deletes the current user's account and cascades to posts/interactions.")
    @ApiResponse(responseCode = "204", description = "Account successfully deleted")
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount() {
        accountManager.deleteAccount();
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get account suggestions", description = "Returns popular accounts the current user does not follow.")
    @GetMapping("/suggestions")
    public ResponseEntity<List<PublicAccountResponse>> getSuggestions(
        @RequestParam(defaultValue = "5") @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(10) int limit) {
        return ResponseEntity.ok(accountManager.getSuggestions(limit));
    }

    @Operation(summary = "Send verification email", description = "Generates an email verification token and sends the email.")
    @PostMapping("/me/email/send-verification")
    @RateLimit(capacity = 3, minutes = 60)
    public ResponseEntity<Void> sendVerificationEmail() {
        accountManager.sendVerificationEmail();
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Change password", description = "Updates the current user's password using their old password.")
    @ApiResponse(responseCode = "204", description = "Password successfully changed")
    @RateLimit(capacity = 5, minutes = 60)
    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        accountManager.changePassword(request);
        return ResponseEntity.noContent().build();
    }

}
