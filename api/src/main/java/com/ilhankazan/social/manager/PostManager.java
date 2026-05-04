package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.interaction.UserInteractions;
import com.ilhankazan.social.dto.post.CreatePostRequest;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.dto.post.UpdatePostRequest;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.event.PostCreatedEvent;
import com.ilhankazan.social.mapper.PostMapper;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.CloudinaryStorageService;
import com.ilhankazan.social.service.InteractionService;
import com.ilhankazan.social.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PostManager {

    private final PostService postService;
    private final PostMapper postMapper;
    private final AccountService accountService;
    private final InteractionService interactionService;
    private final ApplicationEventPublisher eventPublisher;
    private final CloudinaryStorageService storageService;

    private Account getCurrentAccount() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username);
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
        long replyCount = postService.getReplyCounts(ids).getOrDefault(post.getId(), 0L);

        return postMapper.toResponse(post, counts, ui, replyCount);
    }

    private PageResponse<PostResponse> enrichPage(Page<Post> posts, Long currentUserId) {
        if (posts.isEmpty()) {
            return PageResponse.of(posts.map(p -> postMapper.toResponse(p, InteractionCounts.EMPTY, UserInteractions.EMPTY, 0L)));
        }
        List<Long> postIds = posts.stream().map(Post::getId).toList();
        Map<Long, InteractionCounts> countsMap = interactionService.getCountsForPosts(postIds);
        Map<Long, UserInteractions> userMap = interactionService.getUserInteractionsForPosts(postIds, currentUserId);
        Map<Long, Long> replyCountsMap = postService.getReplyCounts(postIds);

        return PageResponse.of(posts.map(post -> postMapper.toResponse(
            post,
            countsMap.getOrDefault(post.getId(), InteractionCounts.EMPTY),
            userMap.getOrDefault(post.getId(), UserInteractions.EMPTY),
            replyCountsMap.getOrDefault(post.getId(), 0L)
        )));
    }

    @Transactional
    public PostResponse create(CreatePostRequest request) {
        Account current = getCurrentAccount();
        Post post = postService.create(current.getId(), request.content(), request.imageUrl(), request.parentPostId());

        PostResponse response = postMapper.toResponse(post, InteractionCounts.EMPTY, UserInteractions.EMPTY, 0L);
        eventPublisher.publishEvent(new PostCreatedEvent(response));
        return response;
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

        Post post = postService.getById(id);
        if (!isAdmin() && !post.getAccount().getId().equals(current.getId())) {
            throw new AccessDeniedException("You can only delete your own posts");
        }

        interactionService.softDeletePostInteractions(id);
        postService.softDeleteReplies(id);
        postService.softDelete(current.getId(), isAdmin(), id);
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> searchPosts(String query, int page, int size) {
        Account current = getCurrentAccount();
        Page<Post> posts = postService.searchPosts(query, PageRequest.of(page, size));
        return enrichPage(posts, current.getId());
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
        Account target = accountService.getAccount(username);
        Page<Post> posts = postService.getProfileFeed(target.getId(), PageRequest.of(page, size));
        return enrichPage(posts, current.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getReplies(Long id, int page, int size) {
        Account current = getCurrentAccount();
        Page<Post> posts = postService.getReplies(id, PageRequest.of(page, size));
        return enrichPage(posts, current.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getProfileReplies(String username, int page, int size) {
        Account current = getCurrentAccount();
        Account target = accountService.getAccount(username);
        Page<Post> posts = postService.getRepliesByAccount(target.getId(), PageRequest.of(page, size));
        return enrichPage(posts, current.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getProfileLikes(String username, int page, int size) {
        Account current = getCurrentAccount();
        Account target = accountService.getAccount(username);
        Page<Post> posts = postService.getLikedPostsByAccount(target.getId(), PageRequest.of(page, size));
        return enrichPage(posts, current.getId());
    }

    @Transactional(readOnly = true)
    public String uploadPostImage(MultipartFile file) {
        return storageService.uploadFile(file, "posts");
    }
}
