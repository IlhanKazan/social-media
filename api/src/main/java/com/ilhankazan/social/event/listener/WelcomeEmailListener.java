package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.event.UserRegisteredEvent;
import com.ilhankazan.social.service.email.EmailMessage;
import com.ilhankazan.social.service.email.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class WelcomeEmailListener {

    private final EmailService emailService;
    private final Environment env;

    @EventListener
    public void handleUserRegistered(UserRegisteredEvent event) {
        String frontendOrigin = env.getProperty("FRONTEND_ORIGIN", "http://localhost:5173");

        EmailMessage message = new EmailMessage(
            event.account().getEmail(),
            "Welcome to SocialHan!",
            "WELCOME",
            Map.of(
                "name", event.account().getDisplayName() != null ? event.account().getDisplayName() : event.account().getUsername(),
                "link", frontendOrigin
            )
        );

        emailService.enqueue(message);
    }
}
