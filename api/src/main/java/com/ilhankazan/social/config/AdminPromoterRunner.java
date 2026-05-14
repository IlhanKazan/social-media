package com.ilhankazan.social.config;

import com.ilhankazan.social.manager.AdminUserManager;
import com.ilhankazan.social.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Arrays;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminPromoterRunner implements CommandLineRunner {

    private final AccountRepository accountRepository;
    private final AdminUserManager adminUserManager;
    private final Environment env;

    @Override
    @Transactional
    public void run(String... args) {
        // CLI arg takes precedence: --promote-admin=<username>
        String username = Arrays.stream(args)
            .filter(arg -> arg.startsWith("--promote-admin="))
            .map(arg -> arg.split("=")[1])
            .findFirst()
            // Fallback: PROMOTE_ADMIN_USERNAME env var (useful on Render where CLI args are not available)
            .orElse(env.getProperty("PROMOTE_ADMIN_USERNAME", ""));

        if (!StringUtils.hasText(username)) {
            return;
        }

        log.info("Attempting to promote user '{}' to ADMIN...", username);
        accountRepository.findByUsername(username).ifPresentOrElse(account -> {
            adminUserManager.promoteUser(account.getId());
            log.info("Successfully promoted '{}' to ADMIN.", username);
        }, () -> log.error("User '{}' not found. Cannot promote to ADMIN.", username));
    }
}
