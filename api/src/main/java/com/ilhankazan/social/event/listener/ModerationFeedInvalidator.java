package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.event.PostModerationDecidedEvent;
import com.ilhankazan.social.manager.PostManager;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class ModerationFeedInvalidator {

    private final SimpMessagingTemplate messagingTemplate;
    private final PostManager postManager;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onModerationDecided(PostModerationDecidedEvent event) {
        if (event.status() == ModerationStatus.CLEAN) {
            PostResponse response = postManager.getForBroadcast(event.postId());
            messagingTemplate.convertAndSend("/topic/feed", response);
            if (response.parentPostId() != null) {
                messagingTemplate.convertAndSend("/topic/post/" + response.parentPostId(), response);
            }
        } else if (event.status() == ModerationStatus.FLAGGED) {
            messagingTemplate.convertAndSend("/topic/feed",
                Map.of("type", "POST_REMOVED", "postId", event.postId()));
        }
    }
}
