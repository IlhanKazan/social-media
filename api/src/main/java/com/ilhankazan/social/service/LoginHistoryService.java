package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.LoginHistory;
import com.ilhankazan.social.repository.LoginHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LoginHistoryService {

    private final LoginHistoryRepository loginHistoryRepository;

    @Transactional(readOnly = true)
    public List<LoginHistory> getRecentLogins(Long accountId, int limit) {
        return loginHistoryRepository.findTop10ByAccountIdOrderByCreatedAtDesc(accountId);
    }

    @Transactional(readOnly = true)
    public Instant getLastLoginDate(Long accountId) {
        return loginHistoryRepository.findFirstByAccountIdOrderByCreatedAtDesc(accountId)
            .map(LoginHistory::getCreatedAt)
            .orElse(null);
    }

}
