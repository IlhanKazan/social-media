package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.EmailOutbox;
import com.ilhankazan.social.entity.EmailStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, Long> {
    List<EmailOutbox> findTop10ByStatusOrderByCreatedAtAsc(EmailStatus status);
    long countByStatusAndSentAtAfter(EmailStatus status, Instant since);
}
