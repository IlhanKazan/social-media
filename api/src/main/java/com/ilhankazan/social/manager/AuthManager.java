package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.LoginRequest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.event.LoginSuccessEvent;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.security.JwtTokenProvider;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.AuthService;
import com.ilhankazan.social.service.TokenBlacklistService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthManager {

    private final AuthService authService;
    private final AccountService accountService;
    private final JwtTokenProvider jwtTokenProvider;
    private final AccountMapper accountMapper;
    private final TokenBlacklistService tokenBlacklistService;
    private final ApplicationEventPublisher eventPublisher;

    public AuthResponse register(RegisterRequest request) {
        Account account = authService.register(
            request.username(), request.email(), request.password(), request.displayName()
        );
        return buildAuthResponse(account);
    }

    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        Account account = authService.authenticate(request.identifier(), request.password());

        eventPublisher.publishEvent(new LoginSuccessEvent(account, ipAddress, userAgent));

        return buildAuthResponse(account);
    }

    public AuthResponse refresh(String refreshToken) {
        try {
            var claims = jwtTokenProvider.validateToken(refreshToken);
            String username = claims.getSubject();
            Account account = accountService.getAccount(username);
            return buildAuthResponse(account);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid refresh token");
        }
    }

    public void logout(String authHeader) {
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            tokenBlacklistService.addToBlacklist(authHeader.substring(7));
        }
    }

    private AuthResponse buildAuthResponse(Account account) {
        String accessToken = jwtTokenProvider.generateAccessToken(
            account.getUsername(), List.of(account.getRole().getName())
        );
        String refreshToken = jwtTokenProvider.generateRefreshToken(account.getUsername());
        return new AuthResponse(accessToken, refreshToken, accountMapper.toSummary(account));
    }
}
