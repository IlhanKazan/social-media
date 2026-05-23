package com.ilhankazan.social.security;

import com.ilhankazan.social.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final AccountRepository accountRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        var account = accountRepository.findByUsername(identifier)
                .orElseGet(() -> accountRepository.findByEmail(identifier)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + identifier)));

        if ("ROLE_BOT".equals(account.getRole().getName())) {
            throw new DisabledException("Bot accounts cannot authenticate");
        }

        var authority = new SimpleGrantedAuthority(account.getRole().getName());

        return new CustomUserDetails(
            account.getId(),
            account.getUsername(),
            account.getPassword(),
            Collections.singleton(authority)
        );
    }
}
