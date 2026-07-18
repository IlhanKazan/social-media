package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.notification.NotificationResponse;
import com.ilhankazan.social.entity.Notification;
import com.ilhankazan.social.entity.NotificationType;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.InteractionService;
import com.ilhankazan.social.service.NotificationService;
import com.ilhankazan.social.service.RepostService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationManager {

    private final NotificationService notificationService;
    private final AccountService accountService;
    private final AccountMapper accountMapper;
    private final InteractionService interactionService;
    private final RepostService repostService;

    private Long getCurrentAccountId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username).getId();
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getNotifications(int page, int size, boolean unreadOnly) {
        Long currentId = getCurrentAccountId();
        Page<Notification> notifications;

        if (unreadOnly) {
            PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
            notifications = notificationService.findUnread(currentId, pageRequest);
        } else {
            PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            notifications = notificationService.findAll(currentId, pageRequest);
        }

        Map<Long, Long> likeCounts = aggregateCounts(notifications.getContent(), NotificationType.LIKE);
        Map<Long, Long> repostCounts = aggregateCounts(notifications.getContent(), NotificationType.REPOST);

        return PageResponse.of(notifications.map(n -> toResponse(n, likeCounts, repostCounts)));
    }

    private Map<Long, Long> aggregateCounts(List<Notification> notifications, NotificationType type) {
        List<Long> refs = notifications.stream()
            .filter(n -> n.getType() == type && n.getReferenceId() != null)
            .map(Notification::getReferenceId)
            .distinct()
            .toList();
        if (refs.isEmpty()) return Map.of();
        if (type == NotificationType.LIKE) {
            return interactionService.getCountsForPosts(refs).entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, e -> e.getValue().likes()));
        }
        return repostService.getRepostCounts(refs);
    }

    private int aggregatedCount(Notification n, Map<Long, Long> likeCounts, Map<Long, Long> repostCounts) {
        long count = switch (n.getType()) {
            case LIKE -> likeCounts.getOrDefault(n.getReferenceId(), 0L);
            case REPOST -> repostCounts.getOrDefault(n.getReferenceId(), 0L);
            default -> 1L;
        };
        return (int) Math.max(1L, count);
    }

    @Cacheable(value = "unreadNotificationCount", key = "@auth.user()")
    @Transactional(readOnly = true)
    public int getUnreadCount() {
        return notificationService.countUnread(getCurrentAccountId());
    }

    @CacheEvict(value = "unreadNotificationCount", key = "@auth.user()")
    @Transactional
    public void markAsRead(Long notificationId) {
        notificationService.markRead(notificationId, getCurrentAccountId());
    }

    @CacheEvict(value = "unreadNotificationCount", key = "@auth.user()")
    @Transactional
    public void markAllAsRead() {
        notificationService.markAllRead(getCurrentAccountId());
    }

    private NotificationResponse toResponse(Notification notification, Map<Long, Long> likeCounts, Map<Long, Long> repostCounts) {
        return new NotificationResponse(
            notification.getId(),
            accountMapper.toPublicResponseNoFollow(notification.getActor()),
            notification.getType().name(),
            notification.getReferenceId(),
            aggregatedCount(notification, likeCounts, repostCounts),
            notification.getReadAt(),
            notification.getCreatedAt(),
            notification.getUpdatedAt()
        );
    }

    @Transactional
    public void deleteNotification(Long id) {
        Notification notification = notificationService.getById(id);
        if (!notification.getRecipient().getId().equals(getCurrentAccountId())) {
            throw new AccessDeniedException("Sadece kendi bildirimlerinizi silebilirsiniz.");
        }
        notificationService.delete(id);
    }
}
