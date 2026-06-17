package com.ilhankazan.social.manager;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.LoginRequest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.event.LoginSuccessEvent;
import com.ilhankazan.social.event.UserRegisteredEvent;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.repository.PasswordResetTokenRepository;
import com.ilhankazan.social.security.JwtTokenProvider;
import com.ilhankazan.social.service.*;
import com.ilhankazan.social.service.email.EmailMessage;
import com.ilhankazan.social.service.email.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.env.Environment;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthManager {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final JwtTokenProvider jwtTokenProvider;
    private final AccountMapper accountMapper;
    private final TokenBlacklistService tokenBlacklistService;
    private final AppProperties.JwtProperties jwtProps;
    private final ApplicationEventPublisher eventPublisher;
    private final AccountService accountService;
    private final AuditLogService auditLogService;
    private final EmailService emailService;
    private final Environment env;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetService passwordResetService;
    private final SystemSettingsService systemSettingsService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (!systemSettingsService.getBooleanSetting(SystemSettingsService.REGISTRATION_ENABLED, true)) {
            throw new AccessDeniedException("Registration is currently disabled.");
        }
        Account account = authService.register(
            request.username(),
            request.email(),
            request.password(),
            request.displayName()
        );
        eventPublisher.publishEvent(new UserRegisteredEvent(account));
        return buildInitialAuthResponse(account, null, null);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        Account account = authService.authenticate(request.identifier(), request.password());
        eventPublisher.publishEvent(new LoginSuccessEvent(account, ipAddress, userAgent));
        return buildInitialAuthResponse(account, ipAddress, userAgent);
    }

    public AuthResponse refresh(String refreshToken, String ipAddress, String userAgent) {
        var result = refreshTokenService.rotate(refreshToken, userAgent, ipAddress);
        return new AuthResponse(
            result.accessToken(),
            result.refreshToken(),
            jwtProps.accessTtlMs(),
            jwtProps.refreshTtlMs(),
            accountMapper.toSummary(result.account())
        );
    }

    public void logout(String authHeader, String refreshToken) {
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            tokenBlacklistService.addToBlacklist(authHeader.substring(7));
        }
        if (StringUtils.hasText(refreshToken)) {
            refreshTokenService.revokeFamilyByToken(refreshToken);
        }
    }

    public void logoutAll() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Account account = accountService.getAccount(username);
        refreshTokenService.revokeAllForAccount(account.getId());
        auditLogService.record("LOGOUT_ALL", "ACCOUNT", account.getId(), null);
    }

    private AuthResponse buildInitialAuthResponse(Account account, String ipAddress, String userAgent) {
        UUID familyId = UUID.randomUUID();
        String refreshToken = refreshTokenService.issue(account, familyId, userAgent, ipAddress);
        String accessToken = jwtTokenProvider.generateAccessToken(account.getUsername(), account.getId(), List.of(account.getRole().getName()));

        return new AuthResponse(
            accessToken,
            refreshToken,
            jwtProps.accessTtlMs(),
            jwtProps.refreshTtlMs(),
            accountMapper.toSummary(account)
        );
    }

    @Transactional
    public void requestPasswordReset(String email, String ipAddress) {
        accountService.findByEmail(email).ifPresent(account -> {
            String plainToken = passwordResetService.createResetToken(account, ipAddress);

            String frontendOrigin = env.getProperty("FRONTEND_ORIGIN", "http://localhost:5173");
            String resetLink = frontendOrigin + "/reset-password?token=" + plainToken;

            emailService.enqueue(new EmailMessage(
                account.getEmail(),
                "Reset your SocialHan password",
                "PASSWORD_RESET",
                Map.of("resetLink", resetLink)
            ));
        });
    }

    @Transactional
    public void confirmPasswordReset(String plainToken, String newPassword) {
        Account account = passwordResetService.validateAndConsumeToken(plainToken);

        account.setPassword(passwordEncoder.encode(newPassword));
        accountService.saveRaw(account);

        refreshTokenService.revokeAllForAccount(account.getId());
        auditLogService.record("PASSWORD_RESET", "ACCOUNT", account.getId(), null);
    }
}
