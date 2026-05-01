package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.interaction.CommentResponse;
import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.interaction.InteractionStatusResponse;
import com.ilhankazan.social.dto.interaction.UserInteractions;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.InteractionType;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.event.InteractionCreatedEvent;
import com.ilhankazan.social.mapper.InteractionMapper;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.InteractionService;
import com.ilhankazan.social.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InteractionManager {

    private final InteractionService interactionService;
    private final PostService postService;
    private final InteractionMapper interactionMapper;
    private final AccountService accountService;
    private final ApplicationEventPublisher eventPublisher;

    private Account getCurrentAccount() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username);
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

    @Transactional
    public CommentResponse addComment(Long postId, String content) {
        Account current = getCurrentAccount();
        Post post = postService.getById(postId);
        var comment = interactionService.addComment(current, post, content);
        eventPublisher.publishEvent(new InteractionCreatedEvent(comment.getId(), postId, current.getId(), "COMMENT", content));
        return interactionMapper.toCommentResponse(comment);
    }

    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> getComments(Long postId, int page, int size) {
        postService.getById(postId);
        return PageResponse.of(
            interactionService.getComments(postId, PageRequest.of(page, size))
                .map(interactionMapper::toCommentResponse)
        );
    }

    @Transactional
    public void deleteComment(Long postId, Long commentId) {
        Account current = getCurrentAccount();
        interactionService.deleteComment(current, isAdmin(), commentId, postId);
    }
}
