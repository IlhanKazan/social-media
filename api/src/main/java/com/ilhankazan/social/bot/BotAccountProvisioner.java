package com.ilhankazan.social.bot;

import com.ilhankazan.social.config.BotProperties;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Role;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Component
@Order(1)
@ConditionalOnProperty(prefix = "app.bot", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class BotAccountProvisioner implements CommandLineRunner {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final BotProperties botProperties;

    @Override
    @Transactional
    public void run(String... args) {
        Role botRole = roleRepository.findByName("ROLE_BOT")
            .orElseThrow(() -> new IllegalStateException("ROLE_BOT not found in database"));

        for (int i = 1; i <= botProperties.accountCount(); i++) {
            String username = "bot_account_" + i;
            if (!accountRepository.existsByUsername(username)) {
                Account bot = new Account();
                bot.setUsername(username);
                bot.setEmail("bot" + i + "@internal.invalid");
                bot.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                bot.setDisplayName("Bot " + i);
                bot.setBio("Automated AI bot account.");
                bot.setRole(botRole);
                bot.setEmailVerified(true);
                bot.setEmailVerifiedAt(Instant.now());
                accountRepository.save(bot);
                log.info("BotAccountProvisioner: created bot account '{}'", username);
            }
        }
    }
}
