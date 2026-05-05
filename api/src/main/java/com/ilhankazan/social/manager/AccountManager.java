package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.account.MyAccountResponse;
import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.account.UpdateProfileRequest;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.FollowService;
import com.ilhankazan.social.service.InteractionService;
import com.ilhankazan.social.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AccountManager {

    private final AccountService accountService;
    private final FollowService followService;
    private final AccountMapper accountMapper;
    private final InteractionService interactionService;
    private final PostService postService;

    private String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private Long getCurrentAccountId() {
        return accountService.getAccount(currentUsername()).getId();
    }

    public MyAccountResponse getCurrentUser() {
        Account account = accountService.getAccount(currentUsername());
        return accountMapper.toMyResponse(account);
    }

    @Cacheable(value = "publicProfilesByUsername", key = "#targetUsername + '-' + @auth.user()")
    public PublicAccountResponse getPublicProfile(String targetUsername) {
        Account targetAccount = accountService.getAccount(targetUsername);
        Long currentUserId = getCurrentAccountId();

        long followers = followService.getFollowerCount(targetAccount.getId());
        long following = followService.getFollowingCount(targetAccount.getId());
        boolean isFollowing = followService.isFollowing(currentUserId, targetAccount.getId());

        return accountMapper.toPublicResponse(targetAccount, followers, following, isFollowing);
    }

    public PageResponse<PublicAccountResponse> searchAccounts(String query, int page, int size) {
        Long currentUserId = getCurrentAccountId();
        Page<Account> accounts = accountService.searchAccountsRaw(query, page, size);

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

    @Transactional
    public void deleteAccount() {
        Account account = accountService.getAccount(currentUsername());
        Long accountId = account.getId();

        followService.deleteUserFollows(accountId);
        interactionService.softDeleteUserInteractions(accountId);
        postService.softDeleteUserPosts(accountId);
        accountService.softDeleteAccount(account);
    }

    @CacheEvict(value = {"publicProfilesByUsername", "suggestions"}, allEntries = true)
    @Transactional
    public MyAccountResponse updateProfile(UpdateProfileRequest request) {
        Account account = accountService.updateProfile(currentUsername(), request.displayName(), request.bio());
        return accountMapper.toMyResponse(account);
    }

    @Transactional
    public String updateAvatar(MultipartFile file) {
        Account account = accountService.updateAvatar(currentUsername(), file);
        return account.getProfileImageUrl();
    }

    @Transactional
    public String updateCover(MultipartFile file) {
        Account account = accountService.updateCover(currentUsername(), file);
        return account.getCoverImageUrl();
    }

    @Cacheable(value = "suggestions", key = "@auth.user()")
    public List<PublicAccountResponse> getSuggestions(int limit) {
        Long currentUserId = getCurrentAccountId();
        List<Account> suggestions = accountService.getSuggestions(currentUserId, Math.min(limit, 10));

        if (suggestions.isEmpty()) return List.of();

        List<Long> accountIds = suggestions.stream().map(Account::getId).toList();
        Map<Long, Long> followersMap = followService.getFollowerCounts(accountIds);
        Map<Long, Long> followingMap = followService.getFollowingCounts(accountIds);

        return suggestions.stream().map(account -> accountMapper.toPublicResponse(
            account,
            followersMap.getOrDefault(account.getId(), 0L),
            followingMap.getOrDefault(account.getId(), 0L),
            false
        )).toList();
    }

}
