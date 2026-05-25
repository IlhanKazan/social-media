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
            final int index = i;
            String username = "bot_account_" + index;
            BotPersonas.Persona persona = BotPersonas.forIndex(index - 1);
            accountRepository.findByUsername(username).ifPresentOrElse(
                existing -> {
                    if (!persona.displayName().equals(existing.getDisplayName()) ||
                        !persona.bio().equals(existing.getBio())) {
                        existing.setDisplayName(persona.displayName());
                        existing.setBio(persona.bio());
                        accountRepository.save(existing);
                        log.info("BotAccountProvisioner: updated persona for '{}'", username);
                    }
                },
                () -> {
                    Account bot = new Account();
                    bot.setUsername(username);
                    bot.setEmail("bot" + index + "@internal.invalid");
                    bot.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                    bot.setDisplayName(persona.displayName());
                    bot.setBio(persona.bio());
                    bot.setRole(botRole);
                    bot.setEmailVerified(true);
                    bot.setEmailVerifiedAt(Instant.now());
                    accountRepository.save(bot);
                    log.info("BotAccountProvisioner: created bot account '{}'", username);
                }
            );
        }
    }
}
