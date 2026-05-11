package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.LoginHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LoginHistoryRepository extends JpaRepository<LoginHistory, Long> {
    List<LoginHistory> findTop10ByAccountIdOrderByCreatedAtDesc(Long accountId);
    Optional<LoginHistory> findFirstByAccountIdOrderByCreatedAtDesc(Long accountId);
}
