package com.ilhankazan.social.service;

import com.ilhankazan.social.exception.AppException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Rejects the handful of passwords that dominate credential-stuffing lists.
 *
 * Length is enforced by bean validation on the request DTOs; this only removes the passwords that
 * pass a length check and still fall in the first few thousand guesses. No composition rules on
 * purpose — they push people toward predictable shapes without adding much entropy.
 */
@Service
@Slf4j
public class PasswordPolicyService {

    private static final String RESOURCE_PATH = "security/common-passwords.txt";

    private Set<String> commonPasswords = Set.of();

    @PostConstruct
    public void loadCommonPasswords() {
        ClassPathResource resource = new ClassPathResource(RESOURCE_PATH);
        if (!resource.exists()) {
            log.error("Common password list not found on classpath: {}. Weak-password rejection is off.", RESOURCE_PATH);
            return;
        }

        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            commonPasswords = reader.lines()
                .filter(line -> !line.isBlank() && !line.startsWith("#"))
                .map(line -> line.trim().toLowerCase())
                .collect(Collectors.toUnmodifiableSet());
            log.info("Password policy ready. {} common passwords rejected.", commonPasswords.size());
        } catch (IOException e) {
            log.error("Failed to read {}. Weak-password rejection is off.", RESOURCE_PATH, e);
        }
    }

    public void validate(String password) {
        if (password != null && commonPasswords.contains(password.trim().toLowerCase())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "PASSWORD_TOO_COMMON",
                "Bu şifre çok yaygın kullanılıyor. Daha az tahmin edilebilir bir şifre seç.");
        }
    }
}
