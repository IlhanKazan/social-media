package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    // participantA her zaman participantB'den küçük ID'ye sahip
    @Query("SELECT c FROM Conversation c WHERE c.participantA.id = :aId AND c.participantB.id = :bId")
    Optional<Conversation> findByParticipants(@Param("aId") Long aId, @Param("bId") Long bId);

    @Query("SELECT c FROM Conversation c WHERE " +
        "(c.participantA.id = :accountId AND (c.hiddenForAAt IS NULL OR c.lastMessageAt > c.hiddenForAAt)) OR " +
        "(c.participantB.id = :accountId AND (c.hiddenForBAt IS NULL OR c.lastMessageAt > c.hiddenForBAt)) " +
        "ORDER BY c.lastMessageAt DESC NULLS LAST")
    Page<Conversation> findByParticipantId(@Param("accountId") Long accountId, Pageable pageable);
}
