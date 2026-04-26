package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.LoginRequest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthManager {
    
    private final AuthService authService;
    
    public AuthResponse register(RegisterRequest request) {
        return authService.register(request);
    }
    
    public AuthResponse login(LoginRequest request) {
        return authService.login(request);
    }
    
    public AuthResponse refresh(String refreshToken) {
        return authService.refresh(refreshToken);
    }
    
    public void logout(String accessToken) {
        authService.logout(accessToken);
    }
}
