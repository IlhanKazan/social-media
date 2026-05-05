package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.notification.NotificationResponse;
import com.ilhankazan.social.entity.Notification;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationManager {

    private final NotificationService notificationService;
    private final AccountService accountService;
    private final AccountMapper accountMapper;

    private Long getCurrentAccountId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username).getId();
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getNotifications(int page, int size, boolean unreadOnly) {
        Long currentId = getCurrentAccountId();
        Page<Notification> notifications;

        if (unreadOnly) {
            notifications = notificationService.findUnread(currentId, PageRequest.of(page, size));
        } else {
            notifications = notificationService.findAll(currentId, PageRequest.of(page, size));
        }

        return PageResponse.of(notifications.map(this::toResponse));
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

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
            notification.getId(),
            accountMapper.toPublicResponseNoFollow(notification.getActor()),
            notification.getType().name(),
            notification.getReferenceId(),
            notification.getReadAt(),
            notification.getCreatedAt()
        );
    }
}
