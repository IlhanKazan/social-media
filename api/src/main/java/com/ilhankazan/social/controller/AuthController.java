package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.LoginRequest;
import com.ilhankazan.social.dto.auth.RefreshRequest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.manager.AuthManager;
import com.ilhankazan.social.security.RateLimit;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthManager authManager;

    @PostMapping("/register")
    @RateLimit(capacity = 5, minutes = 1)
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authManager.register(request));
    }

    @PostMapping("/login")
    @RateLimit(capacity = 5, minutes = 1)
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String ip = httpRequest.getHeader("X-Forwarded-For");
        if (ip == null) ip = httpRequest.getRemoteAddr();

        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authManager.login(request, ip, userAgent));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authManager.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        authManager.logout(authHeader);
        return ResponseEntity.noContent().build();
    }
}
