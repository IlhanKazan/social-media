package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.notification.NotificationResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Notification;
import com.ilhankazan.social.entity.NotificationType;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.event.*;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.InteractionService;
import com.ilhankazan.social.service.NotificationService;
import com.ilhankazan.social.service.PostService;
import com.ilhankazan.social.service.PushNotificationService;
import com.ilhankazan.social.service.RepostService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.Map;
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
    private final PushNotificationService pushNotificationService;
    private final InteractionService interactionService;
    private final RepostService repostService;

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
            notify(notification);
        }

        if (event.post().quotedPost() != null) {
            Long quotedAuthorId = event.post().quotedPost().author().id();
            Notification notification = notificationService.create(
                quotedAuthorId,
                actorId,
                NotificationType.QUOTE_REPOST,
                postId
            );
            notify(notification);
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
        notify(notification);
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
            notify(notification);
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
        notify(notification);
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

            notify(notification);
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
                notify(notification);
            } catch (EntityNotFoundException e) {
                // Etiketlenen kullanici sistemde yoksa sessizce yoksay
            }
        }
    }

    private void notify(Notification notification) {
        if (notification == null) return;

        PublicAccountResponse actorResponse = null;
        if (notification.getActor() != null) {
            actorResponse = accountMapper.toPublicResponseNoFollow(notification.getActor());
        }

        int count = aggregatedCount(notification);

        NotificationResponse response = new NotificationResponse(
            notification.getId(),
            actorResponse,
            notification.getType().name(),
            notification.getReferenceId(),
            count,
            notification.getReadAt(),
            notification.getCreatedAt(),
            notification.getUpdatedAt()
        );

        messagingTemplate.convertAndSendToUser(
            notification.getRecipient().getUsername(),
            "/queue/notifications",
            response
        );

        if (!shouldPush(notification.getType(), count)) return;

        pushNotificationService.send(
            notification.getRecipient().getId(),
            pushTitle(notification),
            pushBody(notification.getType(), count),
            Map.of(
                "type", notification.getType().name(),
                "referenceId", String.valueOf(notification.getReferenceId()),
                "notificationId", String.valueOf(notification.getId())
            )
        );
    }

    // Distinct current likers/reposters of the target, derived from the source tables so
    // toggling a like/repost can never inflate the count. At least 1 (the latest actor).
    private int aggregatedCount(Notification notification) {
        Long ref = notification.getReferenceId();
        long count = switch (notification.getType()) {
            case LIKE -> ref == null ? 0L
                : interactionService.getCountsForPosts(List.of(ref))
                    .getOrDefault(ref, InteractionCounts.EMPTY).likes();
            case REPOST -> ref == null ? 0L
                : repostService.getRepostCounts(List.of(ref)).getOrDefault(ref, 0L);
            default -> 1L;
        };
        return (int) Math.max(1L, count);
    }

    // Aggregatable notifications only push on the first interaction and at milestones;
    // the in-between updates still reach the app silently over websocket.
    private boolean shouldPush(NotificationType type, int count) {
        if (!type.isAggregatable()) return true;
        return count == 1 || count == 10 || count == 50 || count == 100;
    }

    private String pushTitle(Notification notification) {
        Account actor = notification.getActor();
        if (actor == null) {
            return "Sistem Bildirimi";
        }
        return actor.getDisplayName() != null ? actor.getDisplayName() : actor.getUsername();
    }

    private String pushBody(NotificationType type, int count) {
        if (type.isAggregatable() && count > 1) {
            int others = count - 1;
            return switch (type) {
                case LIKE -> "ve " + others + " kişi daha gönderini beğendi.";
                case REPOST -> "ve " + others + " kişi daha gönderini yeniden paylaştı.";
                default -> "ve " + others + " kişi daha etkileşimde bulundu.";
            };
        }
        return switch (type) {
            case LIKE -> "gönderini beğendi.";
            case REPLY -> "sana bir yanıt verdi.";
            case MENTION -> "senden bahsetti.";
            case FOLLOW -> "seni takip etmeye başladı.";
            case REPOST -> "gönderini yeniden paylaştı.";
            case QUOTE_REPOST -> "gönderini alıntıladı.";
            case MODERATION_ALERT -> "Gönderin topluluk kuralları ihlali sebebiyle gizlendi.";
            default -> "yeni bir bildirim gönderdi.";
        };
    }
}
