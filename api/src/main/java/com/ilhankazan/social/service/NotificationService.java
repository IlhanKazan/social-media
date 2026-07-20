package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Notification;
import com.ilhankazan.social.entity.NotificationType;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AccountRepository accountRepository;

    // AFTER_COMMIT'ten çağrıldığı için yeni bir transaction açmak ZORUNDA.
    @CacheEvict(value = "unreadNotificationCount", key = "#result != null ? #result.recipient.username : 'null'")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification create(Long recipientId, Long actorId, NotificationType type, Long referenceId) {
        if (recipientId.equals(actorId)) {
            return null;
        }

        if (type.isAggregatable()) {
            notificationRepository.upsertAggregate(recipientId, actorId, type.name(), referenceId);
            return notificationRepository.findUnreadAggregate(recipientId, type, referenceId).orElse(null);
        }

        Account recipient = accountRepository.findById(recipientId)
            .orElseThrow(() -> new EntityNotFoundException("Recipient not found"));

        Account actor = null;
        if (actorId != null) {
            actor = accountRepository.findById(actorId).orElse(null);
        }

        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setActor(actor);
        notification.setType(type);
        notification.setReferenceId(referenceId);

        return notificationRepository.save(notification);
    }

    // Follow'lar reference_id'ye (post) göre değil (recipient, FOLLOW) bazında coalesce edilir:
    // her takipçi farklı olduğu için tek bir okunmamış "seni takip etti" satırında toplanır.
    @CacheEvict(value = "unreadNotificationCount", key = "#result != null ? #result.recipient.username : 'null'")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification upsertFollow(Long recipientId, Long actorId, Instant followedAt) {
        notificationRepository.upsertFollowAggregate(recipientId, actorId, followedAt);
        return notificationRepository.findUnreadFollowAggregate(recipientId).orElse(null);
    }

    @Transactional(readOnly = true)
    public Page<Notification> findUnread(Long userId, Pageable pageable) {
        return notificationRepository.findByRecipientIdAndReadAtIsNull(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Notification> findAll(Long userId, Pageable pageable) {
        return notificationRepository.findByRecipientId(userId, pageable);
    }

    @Transactional(readOnly = true)
    public int countUnread(Long userId) {
        return notificationRepository.countByRecipientIdAndReadAtIsNull(userId);
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.markAllAsReadByRecipientId(userId);
    }

    @Transactional
    public void markRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new EntityNotFoundException("Notification not found"));

        if (!notification.getRecipient().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to modify this notification");
        }

        notification.setReadAt(Instant.now());
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Notification getById(Long id) {
        return notificationRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Notification not found"));
    }

    @Transactional
    public void delete(Long id) {
        notificationRepository.deleteById(id);
    }

    @Transactional
    public void deleteAll(Long userId) {
        notificationRepository.deleteAllByRecipientId(userId);
    }
}
