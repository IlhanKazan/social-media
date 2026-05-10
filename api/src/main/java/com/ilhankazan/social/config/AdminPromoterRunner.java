package com.ilhankazan.social.config;

import com.ilhankazan.social.manager.AdminUserManager;
import com.ilhankazan.social.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminPromoterRunner implements CommandLineRunner {

    private final AccountRepository accountRepository;
    private final AdminUserManager adminUserManager;

    @Override
    @Transactional
    public void run(String... args) {
        String promoteArg = Arrays.stream(args)
            .filter(arg -> arg.startsWith("--promote-admin="))
            .findFirst()
            .orElse(null);

        if (promoteArg != null) {
            String username = promoteArg.split("=")[1];
            log.info("Attempting to promote user '{}' to ADMIN...", username);

            accountRepository.findByUsername(username).ifPresentOrElse(account -> {
                adminUserManager.promoteUser(account.getId());
                log.info("Successfully promoted '{}' to ADMIN.", username);
            }, () -> log.error("User '{}' not found. Cannot promote to ADMIN.", username));
        }
    }
}
