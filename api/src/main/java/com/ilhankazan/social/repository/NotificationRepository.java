package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("SELECT n FROM Notification n LEFT JOIN FETCH n.actor WHERE n.recipient.id = :recipientId AND n.readAt IS NULL")
    Page<Notification> findByRecipientIdAndReadAtIsNull(@Param("recipientId") Long recipientId, Pageable pageable);

    @Query("SELECT n FROM Notification n LEFT JOIN FETCH n.actor WHERE n.recipient.id = :recipientId")
    Page<Notification> findByRecipientId(@Param("recipientId") Long recipientId, Pageable pageable);

    int countByRecipientIdAndReadAtIsNull(Long recipientId);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = CURRENT_TIMESTAMP WHERE n.recipient.id = :recipientId AND n.readAt IS NULL")
    void markAllAsReadByRecipientId(@Param("recipientId") Long recipientId);
}
