package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Notification;
import com.ilhankazan.social.entity.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Modifying
    @Query(value = """
        INSERT INTO notifications (recipient_id, actor_id, type, reference_id, created_at, updated_at)
        VALUES (:recipientId, :actorId, :type, :referenceId, NOW(), NOW())
        ON CONFLICT (recipient_id, type, reference_id) WHERE read_at IS NULL AND type IN ('LIKE', 'REPOST')
        DO UPDATE SET actor_id = :actorId, updated_at = NOW()
        """, nativeQuery = true)
    void upsertAggregate(@Param("recipientId") Long recipientId,
                         @Param("actorId") Long actorId,
                         @Param("type") String type,
                         @Param("referenceId") Long referenceId);

    @Query("SELECT n FROM Notification n JOIN FETCH n.recipient LEFT JOIN FETCH n.actor "
        + "WHERE n.recipient.id = :recipientId AND n.type = :type AND n.referenceId = :referenceId AND n.readAt IS NULL")
    Optional<Notification> findUnreadAggregate(@Param("recipientId") Long recipientId,
                                               @Param("type") NotificationType type,
                                               @Param("referenceId") Long referenceId);

    @Modifying
    @Query(value = """
        INSERT INTO notifications (recipient_id, actor_id, type, reference_id, created_at, updated_at)
        VALUES (:recipientId, :actorId, 'FOLLOW', :actorId, :followedAt, NOW())
        ON CONFLICT (recipient_id) WHERE read_at IS NULL AND type = 'FOLLOW'
        DO UPDATE SET actor_id = :actorId, reference_id = :actorId, updated_at = NOW()
        """, nativeQuery = true)
    void upsertFollowAggregate(@Param("recipientId") Long recipientId,
                               @Param("actorId") Long actorId,
                               @Param("followedAt") Instant followedAt);

    @Query("SELECT n FROM Notification n JOIN FETCH n.recipient LEFT JOIN FETCH n.actor "
        + "WHERE n.recipient.id = :recipientId AND n.type = com.ilhankazan.social.entity.NotificationType.FOLLOW AND n.readAt IS NULL")
    Optional<Notification> findUnreadFollowAggregate(@Param("recipientId") Long recipientId);

    @Query("SELECT n FROM Notification n LEFT JOIN FETCH n.actor WHERE n.recipient.id = :recipientId AND n.readAt IS NULL")
    Page<Notification> findByRecipientIdAndReadAtIsNull(@Param("recipientId") Long recipientId, Pageable pageable);

    @Query("SELECT n FROM Notification n LEFT JOIN FETCH n.actor WHERE n.recipient.id = :recipientId")
    Page<Notification> findByRecipientId(@Param("recipientId") Long recipientId, Pageable pageable);

    int countByRecipientIdAndReadAtIsNull(Long recipientId);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = CURRENT_TIMESTAMP WHERE n.recipient.id = :recipientId AND n.readAt IS NULL")
    void markAllAsReadByRecipientId(@Param("recipientId") Long recipientId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.recipient.id = :recipientId")
    void deleteAllByRecipientId(@Param("recipientId") Long recipientId);
}
