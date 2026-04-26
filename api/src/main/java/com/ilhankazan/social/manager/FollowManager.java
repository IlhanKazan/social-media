package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.follow.FollowStatusResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FollowManager {

    private final FollowService followService;
    private final AccountService accountService;
    private final AccountMapper accountMapper;

    private Long getCurrentAccountId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username).getId();
    }

    @Transactional
    public void follow(Long targetId) {
        Long currentId = getCurrentAccountId();

        if (currentId.equals(targetId)) {
            throw new IllegalArgumentException("You cannot follow yourself");
        }

        if (followService.isFollowing(currentId, targetId)) {
            return;
        }

        // Fazladan veritabanı okuması yapmamak için Proxy objeler (Referans) kullanıyoruz.
        Account follower = accountService.getAccountReference(currentId);
        Account target = accountService.getAccountReference(targetId);

        followService.follow(follower, target);
    }

    public void unfollow(Long targetId) {
        followService.unfollow(getCurrentAccountId(), targetId);
    }

    public FollowStatusResponse isFollowing(Long targetId) {
        return new FollowStatusResponse(followService.isFollowing(getCurrentAccountId(), targetId));
    }

    private PageResponse<PublicAccountResponse> enrichAccounts(Page<Account> accounts, Long currentUserId) {
        if (accounts.isEmpty()) {
            return PageResponse.of(accounts.map(a -> accountMapper.toPublicResponse(a, 0L, 0L, false)));
        }

        List<Long> accountIds = accounts.stream().map(Account::getId).toList();

        Map<Long, Long> followersMap = followService.getFollowerCounts(accountIds);
        Map<Long, Long> followingMap = followService.getFollowingCounts(accountIds);
        Set<Long> followedByMeSet = followService.getFollowedByMe(currentUserId, accountIds);

        return PageResponse.of(accounts.map(account -> accountMapper.toPublicResponse(
            account,
            followersMap.getOrDefault(account.getId(), 0L),
            followingMap.getOrDefault(account.getId(), 0L),
            followedByMeSet.contains(account.getId())
        )));
    }

    public PageResponse<PublicAccountResponse> getFollowers(Long accountId, int page, int size) {
        Long currentUserId = getCurrentAccountId();
        Page<Account> followersPage = followService.getFollowers(accountId, PageRequest.of(page, size));
        return enrichAccounts(followersPage, currentUserId);
    }

    public PageResponse<PublicAccountResponse> getFollowing(Long accountId, int page, int size) {
        Long currentUserId = getCurrentAccountId();
        Page<Account> followingPage = followService.getFollowing(accountId, PageRequest.of(page, size));
        return enrichAccounts(followingPage, currentUserId);
    }
}
