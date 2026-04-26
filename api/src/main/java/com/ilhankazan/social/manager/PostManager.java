package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.interaction.UserInteractions;
import com.ilhankazan.social.dto.post.CreatePostRequest;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.dto.post.UpdatePostRequest;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.mapper.PostMapper;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.service.InteractionService;
import com.ilhankazan.social.service.PostService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PostManager {

    private final PostService postService;
    private final PostMapper postMapper;
    private final AccountRepository accountRepository;
    private final InteractionService interactionService;

    private Account getCurrentAccount() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountRepository.findByUsername(username)
            .orElseThrow(() -> new EntityNotFoundException("Current user not found"));
    }

    private boolean isAdmin() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities()
            .stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private PostResponse toEnriched(Post post, Long currentUserId) {
        List<Long> ids = List.of(post.getId());
        InteractionCounts counts = interactionService.getCountsForPosts(ids)
            .getOrDefault(post.getId(), InteractionCounts.EMPTY);
        UserInteractions ui = interactionService.getUserInteractionsForPosts(ids, currentUserId)
            .getOrDefault(post.getId(), UserInteractions.EMPTY);
        return postMapper.toResponse(post, counts, ui);
    }

    private PageResponse<PostResponse> enrichPage(Page<Post> posts, Long currentUserId) {
        if (posts.isEmpty()) {
            return PageResponse.of(posts.map(p -> postMapper.toResponse(p, InteractionCounts.EMPTY, UserInteractions.EMPTY)));
        }
        List<Long> postIds = posts.stream().map(Post::getId).toList();
        Map<Long, InteractionCounts> countsMap = interactionService.getCountsForPosts(postIds);
        Map<Long, UserInteractions> userMap = interactionService.getUserInteractionsForPosts(postIds, currentUserId);

        return PageResponse.of(posts.map(post -> postMapper.toResponse(
            post,
            countsMap.getOrDefault(post.getId(), InteractionCounts.EMPTY),
            userMap.getOrDefault(post.getId(), UserInteractions.EMPTY)
        )));
    }

    @Transactional
    public PostResponse create(CreatePostRequest request) {
        Account current = getCurrentAccount();
        Post post = postService.create(current.getId(), request.content(), request.imageUrl(), request.parentPostId());
        return toEnriched(post, current.getId());
    }

    @Transactional
    public PostResponse update(Long id, UpdatePostRequest request) {
        Account current = getCurrentAccount();
        Post post = postService.update(current.getId(), id, request.content(), request.imageUrl());
        return toEnriched(post, current.getId());
    }

    @Transactional
    public void softDelete(Long id) {
        Account current = getCurrentAccount();
        postService.softDelete(current.getId(), isAdmin(), id);
    }

    @Transactional(readOnly = true)
    public PostResponse getById(Long id) {
        Account current = getCurrentAccount();
        return toEnriched(postService.getById(id), current.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getFeed(int page, int size) {
        Account current = getCurrentAccount();
        Page<Post> posts = postService.getFollowingFeed(current.getId(), PageRequest.of(page, size));
        return enrichPage(posts, current.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getExplore(int page, int size) {
        Account current = getCurrentAccount();
        Page<Post> posts = postService.getExploreFeed(PageRequest.of(page, size));
        return enrichPage(posts, current.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getProfileFeed(String username, int page, int size) {
        Account current = getCurrentAccount();
        Account target = accountRepository.findByUsername(username)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + username));
        Page<Post> posts = postService.getProfileFeed(target.getId(), PageRequest.of(page, size));
        return enrichPage(posts, current.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getReplies(Long id, int page, int size) {
        Account current = getCurrentAccount();
        Page<Post> posts = postService.getReplies(id, PageRequest.of(page, size));
        return enrichPage(posts, current.getId());
    }
}