package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE m.conversation.id = :conversationId ORDER BY m.createdAt DESC")
    Page<Message> findByConversationId(@Param("conversationId") Long conversationId, Pageable pageable);

    @Modifying
    @Query("UPDATE Message m SET m.readAt = CURRENT_TIMESTAMP WHERE m.conversation.id = :conversationId AND m.sender.id != :receiverId AND m.readAt IS NULL")
    void markAsRead(@Param("conversationId") Long conversationId, @Param("receiverId") Long receiverId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.id = :conversationId AND m.sender.id != :userId AND m.readAt IS NULL")
    int countUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}
