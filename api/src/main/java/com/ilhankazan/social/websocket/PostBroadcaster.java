package com.ilhankazan.social.websocket;

import com.ilhankazan.social.event.PostCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class PostBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePostCreatedEvent(PostCreatedEvent event) {
        log.debug("Broadcasting new post to /topic/feed: {}", event.post().id());
        messagingTemplate.convertAndSend("/topic/feed", event.post());
    }
}
