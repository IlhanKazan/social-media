package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.interaction.InteractionStatusResponse;
import com.ilhankazan.social.dto.interaction.UserInteractions;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.InteractionType;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.event.InteractionCreatedEvent;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.repository.InteractionRepository;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.FollowService;
import com.ilhankazan.social.service.InteractionService;
import com.ilhankazan.social.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
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
public class InteractionManager {

    private final InteractionService interactionService;
    private final InteractionRepository interactionRepository;
    private final PostService postService;
    private final AccountService accountService;
    private final FollowService followService;
    private final AccountMapper accountMapper;
    private final ApplicationEventPublisher eventPublisher;

    private Account getCurrentAccount() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username);
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicAccountResponse> getLikers(Long postId, int page, int size) {
        Long currentUserId = getCurrentAccount().getId();
        Page<Account> likers = interactionRepository.findLikersByPostId(postId, PageRequest.of(page, size));

        if (likers.isEmpty()) {
            return PageResponse.of(likers.map(a -> accountMapper.toPublicResponse(a, 0L, 0L, false)));
        }

        List<Long> accountIds = likers.stream().map(Account::getId).toList();
        Map<Long, Long> followersMap = followService.getFollowerCounts(accountIds);
        Map<Long, Long> followingMap = followService.getFollowingCounts(accountIds);
        Set<Long> followedByMeSet = followService.getFollowedByMe(currentUserId, accountIds);

        return PageResponse.of(likers.map(account -> accountMapper.toPublicResponse(
            account,
            followersMap.getOrDefault(account.getId(), 0L),
            followingMap.getOrDefault(account.getId(), 0L),
            followedByMeSet.contains(account.getId())
        )));
    }

    private boolean isAdmin() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities()
            .stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    @Transactional
    public InteractionStatusResponse toggleLike(Long postId) {
        Account current = getCurrentAccount();
        Post post = postService.getById(postId);
        interactionService.toggleReaction(current, post, InteractionType.LIKE);

        InteractionStatusResponse status = buildStatus(current.getId(), postId);
        if (status.liked()) {
            eventPublisher.publishEvent(new InteractionCreatedEvent(null, postId, current.getId(), "LIKE", null));
        }
        return status;
    }

    @Transactional
    public InteractionStatusResponse toggleDislike(Long postId) {
        Account current = getCurrentAccount();
        Post post = postService.getById(postId);
        interactionService.toggleReaction(current, post, InteractionType.DISLIKE);
        return buildStatus(current.getId(), postId);
    }

    private InteractionStatusResponse buildStatus(Long accountId, Long postId) {
        List<Long> ids = List.of(postId);
        InteractionCounts counts = interactionService.getCountsForPosts(ids).getOrDefault(postId, InteractionCounts.EMPTY);
        UserInteractions ui = interactionService.getUserInteractionsForPosts(ids, accountId).getOrDefault(postId, UserInteractions.EMPTY);
        return new InteractionStatusResponse(ui.liked(), ui.disliked(), counts.likes(), counts.dislikes());
    }

}
