package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m JOIN FETCH m.sender WHERE m.conversation.id = :conversationId ORDER BY m.createdAt DESC")
    Page<Message> findByConversationId(@Param("conversationId") Long conversationId, Pageable pageable);

    @Query("""
        SELECT m FROM Message m JOIN FETCH m.sender
        WHERE m.id IN (
            SELECT MAX(m2.id) FROM Message m2
            WHERE m2.conversation.id IN :conversationIds
            GROUP BY m2.conversation.id
        )
    """)
    List<Message> findLatestMessagesForConversations(@Param("conversationIds") List<Long> conversationIds);

    @Modifying
    @Query("UPDATE Message m SET m.readAt = CURRENT_TIMESTAMP WHERE m.conversation.id = :conversationId AND m.sender.id != :receiverId AND m.readAt IS NULL")
    void markAsRead(@Param("conversationId") Long conversationId, @Param("receiverId") Long receiverId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.id = :conversationId AND m.sender.id != :userId AND m.readAt IS NULL")
    int countUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    @Query("""
        SELECT m FROM Message m
        WHERE m.conversation.id = :conversationId
          AND (:before IS NULL OR m.id < :before)
        ORDER BY m.id DESC
    """)
    List<Message> findThreadPage(@Param("conversationId") Long conversationId,
                                 @Param("before") Long before,
                                 Pageable pageable);

    @Query("SELECT COUNT(m) FROM Message m WHERE (m.conversation.participantA.id = :userId OR m.conversation.participantB.id = :userId) AND m.sender.id != :userId AND m.readAt IS NULL")
    int countTotalUnreadMessagesForUser(@Param("userId") Long userId);
}
