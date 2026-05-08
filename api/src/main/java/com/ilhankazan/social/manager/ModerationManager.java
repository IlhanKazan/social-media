package com.ilhankazan.social.manager;

import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.event.PostModerationDecidedEvent;
import com.ilhankazan.social.service.PostService;
import com.ilhankazan.social.service.moderation.ContentModerator;
import com.ilhankazan.social.service.moderation.ModerationResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModerationManager {

    private final PostService postService;
    private final ContentModerator contentModerator;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void processModeration(Long postId) {
        log.debug("Processing moderation for post ID: {}", postId);
        try {
            Post post = postService.getById(postId);
            if (post.getModerationStatus() != ModerationStatus.PENDING) return;

            String content = post.getContent();
            List<String> imageUrls = List.of();

            ModerationResult result = contentModerator.moderate(content, imageUrls);
            ModerationStatus status = result.flagged() ? ModerationStatus.FLAGGED : ModerationStatus.CLEAN;

            postService.updateModerationResult(postId, status, result.provider(), result.categoryScores());

            eventPublisher.publishEvent(new PostModerationDecidedEvent(
                postId,
                post.getAccount().getUsername(),
                status
            ));
        } catch (Exception e) {
            log.error("Moderation failed for post ID: {}. Triggering failure handler.", postId, e);
            postService.handleModerationFailure(postId);
        }
    }
}
