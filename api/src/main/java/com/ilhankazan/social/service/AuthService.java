package com.ilhankazan.social.service;

import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.LoginRequest;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Role;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.RoleRepository;
import com.ilhankazan.social.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final AccountMapper accountMapper;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (accountRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username is already taken");
        }
        if (accountRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email is already registered");
        }

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new IllegalStateException("Default role ROLE_USER not found"));

        Account account = new Account();
        account.setUsername(request.username());
        account.setEmail(request.email());
        account.setPassword(passwordEncoder.encode(request.password()));
        account.setDisplayName(request.displayName() != null ? request.displayName() : request.username());
        account.setRole(userRole);

        account = accountRepository.save(account);

        return buildAuthResponse(account);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.identifier(), request.password())
        );

        String username = authentication.getName();
        Account account = accountRepository.findByUsername(username)
                .orElseGet(() -> accountRepository.findByEmail(username)
                        .orElseThrow(() -> new IllegalArgumentException("User not found")));

        return buildAuthResponse(account);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(String refreshToken) {
        try {
            var claims = jwtTokenProvider.validateToken(refreshToken);
            String username = claims.getSubject();
            Account account = accountRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            return buildAuthResponse(account);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid refresh token");
        }
    }

    public void logout(String accessToken) {
        // Optional: Implement token blacklisting here
    }

    private AuthResponse buildAuthResponse(Account account) {
        String accessToken = jwtTokenProvider.generateAccessToken(account.getUsername(), List.of(account.getRole().getName()));
        String refreshToken = jwtTokenProvider.generateRefreshToken(account.getUsername());
        return new AuthResponse(accessToken, refreshToken, accountMapper.toSummary(account));
    }
}
