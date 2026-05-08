package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.event.PostNeedsModerationEvent;
import com.ilhankazan.social.manager.ModerationManager;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ContentModerationListener {

    private final ModerationManager moderationManager;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleModeration(PostNeedsModerationEvent event) {
        moderationManager.processModeration(event.postId());
    }
}
