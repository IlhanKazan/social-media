package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.message.SendMessageRequest;
import com.ilhankazan.social.manager.MessageManager;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class DmWebSocketController {

    private final MessageManager messageManager;

    @MessageMapping("/dm.send")
    public void sendMessage(@Payload SendMessageRequest request, Principal principal) {
        // STOMP thread'inde çalistigimız icin SecurityContext'i manuel set ediyoruz.
        // Aksi halde MessageManager icindeki getCurrentAccount() NPE atar.
        if (principal instanceof Authentication auth) {
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);
            SecurityContextHolder.setContext(context);
            try {
                messageManager.sendMessage(request.conversationId(), request.content());
            } finally {
                SecurityContextHolder.clearContext();
            }
        }
    }
}
