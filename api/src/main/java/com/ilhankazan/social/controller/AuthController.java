package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.auth.*;
import com.ilhankazan.social.manager.AccountManager;
import com.ilhankazan.social.manager.AuthManager;
import com.ilhankazan.social.security.AuthCookieFactory;
import com.ilhankazan.social.security.AuthRequestOriginGuard;
import com.ilhankazan.social.security.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for registration, login, and secure token rotation")
public class AuthController {

    private final AuthManager authManager;
    private final AccountManager accountManager;
    private final AuthCookieFactory authCookieFactory;
    private final AuthRequestOriginGuard originGuard;

    @Operation(summary = "Register a new user", description = "Creates a new account and returns an access token. The refresh token is set as an HttpOnly cookie.")
    @ApiResponse(responseCode = "201", description = "User successfully registered")
    @ApiResponse(responseCode = "400", description = "Validation error or username/email already exists")
    @PostMapping("/register")
    @RateLimit(capacity = 5, minutes = 1)
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return tokenResponse(HttpStatus.CREATED, authManager.register(request));
    }

    @Operation(summary = "Login to account", description = "Authenticates user and issues an access token. The refresh token is set as an HttpOnly cookie and starts a new token family.")
    @ApiResponse(responseCode = "200", description = "Successfully authenticated")
    @ApiResponse(responseCode = "401", description = "Invalid credentials")
    @PostMapping("/login")
    @RateLimit(capacity = 5, minutes = 1)
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String userAgent = httpRequest.getHeader("User-Agent");
        LoginResult result = authManager.login(request, clientIp(httpRequest), userAgent);
        if (result.mfaRequired()) {
            return ResponseEntity.ok(LoginResponse.mfaRequired(result.mfaToken(), result.methods()));
        }
        return authenticatedResponse(HttpStatus.OK, result.auth());
    }

    @Operation(summary = "Verify MFA", description = "Completes a login that requires a second factor and issues tokens.")
    @ApiResponse(responseCode = "200", description = "Second factor accepted")
    @ApiResponse(responseCode = "401", description = "Invalid or expired code/session")
    @PostMapping("/mfa/verify")
    @RateLimit(capacity = 10, minutes = 5)
    public ResponseEntity<LoginResponse> verifyMfa(@Valid @RequestBody MfaVerifyRequest request, HttpServletRequest httpRequest) {
        String userAgent = httpRequest.getHeader("User-Agent");
        AuthResponse auth = authManager.verifyMfa(request.mfaToken(), request.method(), request.code(), clientIp(httpRequest), userAgent);
        return authenticatedResponse(HttpStatus.OK, auth);
    }

    @Operation(summary = "Resend MFA email code", description = "Re-sends the email one-time code for an in-progress MFA login.")
    @ApiResponse(responseCode = "204", description = "Code re-sent if the session is valid")
    @PostMapping("/mfa/resend")
    @RateLimit(capacity = 3, minutes = 5)
    public ResponseEntity<Void> resendMfa(@Valid @RequestBody MfaResendRequest request) {
        authManager.resendMfaCode(request.mfaToken());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Refresh tokens", description = "Rotates the refresh token (read from the HttpOnly cookie) and issues a new access token. Invalidates the old refresh token.")
    @ApiResponse(responseCode = "200", description = "Tokens successfully rotated")
    @ApiResponse(responseCode = "401", description = "Invalid, missing, or reused refresh token")
    @ApiResponse(responseCode = "403", description = "Cross-origin request rejected")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
        @CookieValue(name = "${app.auth.cookie.name}", required = false) String refreshToken,
        HttpServletRequest httpRequest) {
        originGuard.verify(httpRequest);
        if (!StringUtils.hasText(refreshToken)) {
            throw new BadCredentialsException("Missing refresh token");
        }
        String userAgent = httpRequest.getHeader("User-Agent");
        return tokenResponse(HttpStatus.OK, authManager.refresh(refreshToken, clientIp(httpRequest), userAgent));
    }

    @Operation(summary = "Logout specific session", description = "Blacklists the current access token, revokes the refresh token's family (read from the HttpOnly cookie), and clears the cookie.")
    @ApiResponse(responseCode = "204", description = "Successfully logged out")
    @ApiResponse(responseCode = "403", description = "Cross-origin request rejected")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @CookieValue(name = "${app.auth.cookie.name}", required = false) String refreshToken,
        HttpServletRequest httpRequest) {
        originGuard.verify(httpRequest);
        authManager.logout(authHeader, refreshToken);
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, authCookieFactory.clear().toString())
            .build();
    }

    @Operation(summary = "Logout all sessions", description = "Revokes all refresh tokens for the authenticated user, forcing logouts across all devices.")
    @ApiResponse(responseCode = "204", description = "All sessions successfully revoked")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAll() {
        authManager.logoutAll();
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Request password reset", description = "Generates a reset token and sends an email if the account exists.")
    @ApiResponse(responseCode = "204", description = "Request processed (no leak on email existence)")
    @PostMapping("/password-reset/request")
    @RateLimit(capacity = 3, minutes = 60)
    public ResponseEntity<Void> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request, HttpServletRequest httpRequest) {
        authManager.requestPasswordReset(request.email(), clientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Confirm password reset", description = "Validates the token and updates the user's password. Revokes all active sessions.")
    @ApiResponse(responseCode = "204", description = "Password successfully reset")
    @ApiResponse(responseCode = "400", description = "Invalid or expired token")
    @PostMapping("/password-reset/confirm")
    @RateLimit(capacity = 5, minutes = 60)
    public ResponseEntity<Void> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        authManager.confirmPasswordReset(request.token(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Verify email", description = "Verifies the email using the provided token. Publicly accessible.")
    @ApiResponse(responseCode = "204", description = "Email successfully verified")
    @ApiResponse(responseCode = "400", description = "Invalid or expired token")
    @PostMapping("/verify-email")
    @RateLimit(capacity = 5, minutes = 60)
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        accountManager.verifyEmail(request.token());
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<AuthResponse> tokenResponse(HttpStatus status, AuthResponse resp) {
        ResponseCookie cookie = authCookieFactory.build(resp.refreshToken());
        return ResponseEntity.status(status)
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .body(withoutRefreshToken(resp));
    }

    private ResponseEntity<LoginResponse> authenticatedResponse(HttpStatus status, AuthResponse resp) {
        ResponseCookie cookie = authCookieFactory.build(resp.refreshToken());
        return ResponseEntity.status(status)
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .body(LoginResponse.authenticated(resp));
    }

    private AuthResponse withoutRefreshToken(AuthResponse resp) {
        return new AuthResponse(
            resp.accessToken(),
            null,
            resp.accessTokenExpiresIn(),
            resp.refreshTokenExpiresIn(),
            resp.account());
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
