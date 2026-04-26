package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Follow;
import com.ilhankazan.social.repository.FollowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ilhankazan.social.repository.FollowRepository.AccountCountRow;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;

    @Transactional
    public void follow(Account follower, Account target) {
        Follow follow = new Follow();
        follow.setFollower(follower);
        follow.setFollowing(target);
        followRepository.save(follow);
    }

    @Transactional
    public void unfollow(Long followerId, Long followingId) {
        followRepository.deleteByFollowerIdAndFollowingId(followerId, followingId);
    }

    @Transactional
    public void deleteUserFollows(Long accountId) {
        followRepository.deleteByAccountId(accountId);
    }

    @Transactional(readOnly = true)
    public boolean isFollowing(Long followerId, Long followingId) {
        return followRepository.existsByFollowerIdAndFollowingId(followerId, followingId);
    }

    @Transactional(readOnly = true)
    public Page<Account> getFollowers(Long accountId, Pageable pageable) {
        return followRepository.findFollowersByFollowingId(accountId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Account> getFollowing(Long accountId, Pageable pageable) {
        return followRepository.findFollowingByFollowerId(accountId, pageable);
    }

    @Transactional(readOnly = true)
    public long getFollowerCount(Long accountId) {
        return followRepository.countByFollowingId(accountId);
    }

    @Transactional(readOnly = true)
    public long getFollowingCount(Long accountId) {
        return followRepository.countByFollowerId(accountId);
    }

    @Transactional(readOnly = true)
    public Map<Long, Long> getFollowerCounts(List<Long> accountIds) {
        if (accountIds.isEmpty()) return Collections.emptyMap();
        return followRepository.countFollowersForAccounts(accountIds).stream()
            .collect(Collectors.toMap(AccountCountRow::getAccountId, AccountCountRow::getCount));
    }

    @Transactional(readOnly = true)
    public Map<Long, Long> getFollowingCounts(List<Long> accountIds) {
        if (accountIds.isEmpty()) return Collections.emptyMap();
        return followRepository.countFollowingForAccounts(accountIds).stream()
            .collect(Collectors.toMap(AccountCountRow::getAccountId, AccountCountRow::getCount));
    }

    @Transactional(readOnly = true)
    public Set<Long> getFollowedByMe(Long currentUserId, List<Long> targetIds) {
        if (targetIds.isEmpty()) return Collections.emptySet();
        return new HashSet<>(followRepository.findFollowingIdsByFollowerIdAndFollowingIdsIn(currentUserId, targetIds));
    }
}
