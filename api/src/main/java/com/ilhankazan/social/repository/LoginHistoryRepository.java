package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.LoginHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginHistoryRepository extends JpaRepository<LoginHistory, Long> {}
