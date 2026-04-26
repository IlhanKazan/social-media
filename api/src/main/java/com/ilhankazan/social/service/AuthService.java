package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Role;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public Account register(String username, String email, String password, String displayName) {
        if (accountRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username is already taken");
        }
        if (accountRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }

        Role userRole = roleRepository.findByName("ROLE_USER")
            .orElseThrow(() -> new IllegalStateException("Default role ROLE_USER not found"));

        Account account = new Account();
        account.setUsername(username);
        account.setEmail(email);
        account.setPassword(passwordEncoder.encode(password));
        account.setDisplayName(displayName != null ? displayName : username);
        account.setRole(userRole);

        return accountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public Account authenticate(String identifier, String password) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(identifier, password)
        );

        String username = authentication.getName();
        return accountRepository.findByUsername(username)
            .orElseGet(() -> accountRepository.findByEmail(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found")));
    }
}
