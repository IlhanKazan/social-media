package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.event.UserRegisteredEvent;
import com.ilhankazan.social.service.email.EmailMessage;
import com.ilhankazan.social.service.email.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class WelcomeEmailListener {

    private final EmailService emailService;

    @EventListener
    public void handleUserRegistered(UserRegisteredEvent event) {
        EmailMessage message = new EmailMessage(
            event.account().getEmail(),
            "MicroBlog'a Hoş Geldin!",
            "WELCOME",
            Map.of(
                "name", event.account().getDisplayName() != null ? event.account().getDisplayName() : event.account().getUsername(),
                "link", "http://localhost:5173"
            )
        );

        emailService.enqueue(message);
    }
}
