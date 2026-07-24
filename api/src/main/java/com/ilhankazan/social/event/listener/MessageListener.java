package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.dto.message.MessageResponse;
import com.ilhankazan.social.event.MessageCreatedEvent;
import com.ilhankazan.social.event.MessagesReadEvent;
import com.ilhankazan.social.service.PushNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class MessageListener {

    private static final int PUSH_BODY_MAX_LENGTH = 100;

    private final SimpMessagingTemplate messagingTemplate;
    private final PushNotificationService pushNotificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessageCreated(MessageCreatedEvent event) {
        // her iki kullaniciya da pushluyoruz
        messagingTemplate.convertAndSendToUser(event.participantAUsername(), "/queue/messages", event.message());
        messagingTemplate.convertAndSendToUser(event.participantBUsername(), "/queue/messages", event.message());

        MessageResponse message = event.message();
        pushNotificationService.send(
            event.recipientId(),
            pushTitle(message),
            pushBody(message),
            Map.of(
                "type", "MESSAGE",
                "conversationId", String.valueOf(message.conversationId())
            )
        );
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessagesRead(MessagesReadEvent event) {
        Map<String, Object> payload = Map.of(
            "conversationId", event.conversationId(),
            "readAt", event.readAt()
        );

        messagingTemplate.convertAndSendToUser(event.otherParticipantUsername(), "/queue/read-receipts", payload);
    }

    private String pushTitle(MessageResponse message) {
        String displayName = message.sender().displayName();
        return displayName != null && !displayName.isBlank() ? displayName : message.sender().username();
    }

    private String pushBody(MessageResponse message) {
        if (message.content() != null && !message.content().isBlank()) {
            String content = message.content();
            return content.length() > PUSH_BODY_MAX_LENGTH
                ? content.substring(0, PUSH_BODY_MAX_LENGTH) + "…"
                : content;
        }
        if (message.imageUrl() != null) return "Fotoğraf gönderdi";
        if (message.sharedPost() != null) return "Bir gönderi paylaştı";
        return "Yeni mesaj";
    }
}
