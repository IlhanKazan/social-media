package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.event.MessageCreatedEvent;
import com.ilhankazan.social.event.MessagesReadEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class MessageListener {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessageCreated(MessageCreatedEvent event) {
        // her iki kullaniciya da pushluyoruz
        messagingTemplate.convertAndSendToUser(event.participantAUsername(), "/queue/messages", event.message());
        messagingTemplate.convertAndSendToUser(event.participantBUsername(), "/queue/messages", event.message());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMessagesRead(MessagesReadEvent event) {
        Map<String, Object> payload = Map.of(
            "conversationId", event.conversationId(),
            "readAt", event.readAt()
        );

        messagingTemplate.convertAndSendToUser(event.otherParticipantUsername(), "/queue/read-receipts", payload);
    }
}
