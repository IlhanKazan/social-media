package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.auth.*;
import com.ilhankazan.social.manager.AuthManager;
import com.ilhankazan.social.security.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for registration, login, and secure token rotation")
public class AuthController {

    private final AuthManager authManager;

    @Operation(summary = "Register a new user", description = "Creates a new account and returns auth tokens.")
    @ApiResponse(responseCode = "201", description = "User successfully registered")
    @ApiResponse(responseCode = "400", description = "Validation error or username/email already exists")
    @PostMapping("/register")
    @RateLimit(capacity = 5, minutes = 1)
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authManager.register(request));
    }

    @Operation(summary = "Login to account", description = "Authenticates user and issues access/refresh tokens. Starts a new token family.")
    @ApiResponse(responseCode = "200", description = "Successfully authenticated")
    @ApiResponse(responseCode = "401", description = "Invalid credentials")
    @PostMapping("/login")
    @RateLimit(capacity = 5, minutes = 1)
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String ip = httpRequest.getHeader("X-Forwarded-For");
        if (ip == null) ip = httpRequest.getRemoteAddr();

        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authManager.login(request, ip, userAgent));
    }

    @Operation(summary = "Refresh tokens", description = "Rotates the refresh token and issues a new access token. Invalidates the old refresh token.")
    @ApiResponse(responseCode = "200", description = "Tokens successfully rotated")
    @ApiResponse(responseCode = "401", description = "Invalid or reused refresh token")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        String ip = httpRequest.getHeader("X-Forwarded-For");
        if (ip == null) ip = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authManager.refresh(request.refreshToken(), ip, userAgent));
    }

    @Operation(summary = "Logout specific session", description = "Blacklists the current access token and revokes the provided refresh token's family.")
    @ApiResponse(responseCode = "204", description = "Successfully logged out")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @Valid @RequestBody LogoutRequest request) {
        authManager.logout(authHeader, request.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Logout all sessions", description = "Revokes all refresh tokens for the authenticated user, forcing logouts across all devices.")
    @ApiResponse(responseCode = "204", description = "All sessions successfully revoked")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAll() {
        authManager.logoutAll();
        return ResponseEntity.noContent().build();
    }
}
