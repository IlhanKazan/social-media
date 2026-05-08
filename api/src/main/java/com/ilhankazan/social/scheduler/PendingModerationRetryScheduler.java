package com.ilhankazan.social.scheduler;

import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.manager.ModerationManager;
import com.ilhankazan.social.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PendingModerationRetryScheduler {

    private final PostService postService;
    private final ModerationManager moderationManager;

    @Scheduled(fixedDelay = 300000)
    public void retryPendingModerations() {
        Instant cutoff = Instant.now().minus(60, ChronoUnit.SECONDS);
        List<Post> pendingPosts = postService.getPendingPostsOlderThan(cutoff, 50);

        if (!pendingPosts.isEmpty()) {
            log.info("Found {} PENDING posts older than 60s. Retrying moderation...", pendingPosts.size());
            for (Post post : pendingPosts) {
                moderationManager.processModeration(post.getId());
            }
        }
    }
}
