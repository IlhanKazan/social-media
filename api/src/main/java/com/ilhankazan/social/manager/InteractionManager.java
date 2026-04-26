package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.interaction.CommentResponse;
import com.ilhankazan.social.dto.interaction.InteractionStatusResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.InteractionType;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.mapper.InteractionMapper;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.service.InteractionService;
import com.ilhankazan.social.service.PostService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InteractionManager {

    private final InteractionService interactionService;
    private final PostService postService;
    private final InteractionMapper interactionMapper;
    private final AccountRepository accountRepository;

    private Account getCurrentAccount() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountRepository.findByUsername(username)
            .orElseThrow(() -> new EntityNotFoundException("Current user not found"));
    }

    private boolean isAdmin() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities()
            .stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    @Transactional
    public InteractionStatusResponse toggleLike(Long postId) {
        Account current = getCurrentAccount();
        Post post = postService.getById(postId);
        return interactionService.toggleReaction(current, post, InteractionType.LIKE);
    }

    @Transactional
    public InteractionStatusResponse toggleDislike(Long postId) {
        Account current = getCurrentAccount();
        Post post = postService.getById(postId);
        return interactionService.toggleReaction(current, post, InteractionType.DISLIKE);
    }

    @Transactional
    public CommentResponse addComment(Long postId, String content) {
        Account current = getCurrentAccount();
        Post post = postService.getById(postId);
        var comment = interactionService.addComment(current, post, content);
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