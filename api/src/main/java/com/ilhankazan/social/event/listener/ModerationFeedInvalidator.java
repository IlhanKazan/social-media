package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.event.PostModerationDecidedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class ModerationFeedInvalidator {

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void onModerationDecided(PostModerationDecidedEvent event) {
        if (event.status() == ModerationStatus.FLAGGED) {
            messagingTemplate.convertAndSend("/topic/feed",
                Map.of("type", "POST_REMOVED", "postId", event.postId()));
        } else if (event.status() == ModerationStatus.CLEAN) {
            messagingTemplate.convertAndSend("/topic/feed",
                Map.of("type", "POST_VISIBLE", "postId", event.postId()));
        }
    }
}
