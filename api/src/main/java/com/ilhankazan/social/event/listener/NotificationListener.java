package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.notification.NotificationResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Notification;
import com.ilhankazan.social.entity.NotificationType;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.event.*;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.NotificationService;
import com.ilhankazan.social.service.PostService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class NotificationListener {

    private final NotificationService notificationService;
    private final PostService postService;
    private final AccountService accountService;
    private final SimpMessagingTemplate messagingTemplate;
    private final AccountMapper accountMapper;

    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9_]+)");

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePostCreated(PostCreatedEvent event) {
        Long actorId = event.post().author().id();
        Long postId = event.post().id();

        if (event.post().parentPostId() != null) {
            Post parentPost = postService.getById(event.post().parentPostId());
            Notification notification = notificationService.create(
                parentPost.getAccount().getId(),
                actorId,
                NotificationType.REPLY,
                postId
            );
            pushToWebSocket(notification);
        }

        if (event.post().quotedPost() != null) {
            Long quotedAuthorId = event.post().quotedPost().author().id();
            Notification notification = notificationService.create(
                quotedAuthorId,
                actorId,
                NotificationType.QUOTE_REPOST,
                postId
            );
            pushToWebSocket(notification);
        }

        handleMentions(event.post().content(), actorId, postId);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleRepostCreated(RepostCreatedEvent event) {
        Notification notification = notificationService.create(
            event.originalPostAuthorId(),
            event.reposterId(),
            NotificationType.REPOST,
            event.originalPostId()
        );
        pushToWebSocket(notification);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleInteractionCreated(InteractionCreatedEvent event) {
        if ("LIKE".equals(event.type())) {
            Post post = postService.getById(event.postId());

            Notification notification = notificationService.create(
                post.getAccount().getId(),
                event.actorId(),
                NotificationType.LIKE,
                post.getId()
            );
            pushToWebSocket(notification);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleFollowCreated(FollowCreatedEvent event) {
        Notification notification = notificationService.create(
            event.followingId(),
            event.followerId(),
            NotificationType.FOLLOW,
            event.followerId()
        );
        pushToWebSocket(notification);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleModerationDecided(PostModerationDecidedEvent event) {
        if (event.status() == com.ilhankazan.social.entity.ModerationStatus.FLAGGED) {
            Account author = accountService.getAccount(event.authorUsername());

            Notification notification = notificationService.create(
                author.getId(),
                null,
                NotificationType.MODERATION_ALERT,
                event.postId()
            );

            pushToWebSocket(notification);
        }
    }

    private void handleMentions(String content, Long actorId, Long referenceId) {
        if (content == null) return;
        Matcher matcher = MENTION_PATTERN.matcher(content);

        while (matcher.find()) {
            String username = matcher.group(1);
            try {
                Account mentionedUser = accountService.getAccount(username);
                Notification notification = notificationService.create(
                    mentionedUser.getId(),
                    actorId,
                    NotificationType.MENTION,
                    referenceId
                );
                pushToWebSocket(notification);
            } catch (EntityNotFoundException e) {
                // Etiketlenen kullanici sistemde yoksa sessizce yoksay
            }
        }
    }

    private void pushToWebSocket(Notification notification) {
        if (notification == null) return;

        PublicAccountResponse actorResponse = null;
        if (notification.getActor() != null) {
            actorResponse = accountMapper.toPublicResponseNoFollow(notification.getActor());
        }

        NotificationResponse response = new NotificationResponse(
            notification.getId(),
            actorResponse,
            notification.getType().name(),
            notification.getReferenceId(),
            notification.getReadAt(),
            notification.getCreatedAt()
        );

        messagingTemplate.convertAndSendToUser(
            notification.getRecipient().getUsername(),
            "/queue/notifications",
            response
        );
    }
}
