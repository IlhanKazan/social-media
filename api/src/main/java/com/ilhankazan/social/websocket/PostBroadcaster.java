package com.ilhankazan.social.websocket;

import com.ilhankazan.social.event.RepostCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// New posts are NOT broadcast at create time (fail-closed moderation): the author
// gets an optimistic echo from the create HTTP response, and followers receive the
// post only once it becomes CLEAN, via ModerationFeedInvalidator. Reposts point at
// an already-visible post, so they still broadcast immediately.
@Component
@RequiredArgsConstructor
@Slf4j
public class PostBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleRepostCreatedEvent(RepostCreatedEvent event) {
        log.debug("Broadcasting new repost to /topic/feed: originalPostId {}", event.originalPostId());
        messagingTemplate.convertAndSend("/topic/feed", event.originalPostResponse());
    }
}
