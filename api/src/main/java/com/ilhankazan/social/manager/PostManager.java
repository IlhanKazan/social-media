package com.ilhankazan.social.manager;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.interaction.UserInteractions;
import com.ilhankazan.social.dto.post.*;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.event.PostCreatedEvent;
import com.ilhankazan.social.event.RepostCreatedEvent;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.mapper.PostMapper;
import com.ilhankazan.social.repository.projection.FeedItemProjection;
import com.ilhankazan.social.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import com.ilhankazan.social.security.AuthCacheResolver;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostManager {

    private final PostService postService;
    private final PostMapper postMapper;
    private final AccountService accountService;
    private final InteractionService interactionService;
    private final ApplicationEventPublisher eventPublisher;
    private final CloudinaryStorageService storageService;
    private final RepostService repostService;
    private final AccountMapper accountMapper;
    private final PostingPolicy postingPolicy;
    private final AuthCacheResolver authResolver;
    private final AppProperties.CloudinaryProperties cloudinaryProperties;

    private void requireAllowedImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;
        String allowedPrefix = "https://res.cloudinary.com/" + cloudinaryProperties.cloudName() + "/";
        if (!imageUrl.startsWith(allowedPrefix)) {
            throw new IllegalArgumentException("Image URL must come from the image upload endpoint");
        }
    }

    private Long currentUserIdOrNull() {
        String username = authResolver.usernameOrNull();
        return username == null ? null : accountService.getAccount(username).getId();
    }

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

        long repostCount = repostService.getRepostCounts(ids).getOrDefault(post.getId(), 0L);
        boolean repostedByMe = repostService.getRepostedByMe(currentUserId, ids).contains(post.getId());

        return postMapper.toResponse(post, counts, ui, replyCount, repostCount, repostedByMe);
    }

    private PageResponse<PostResponse> enrichPage(Page<Post> posts, Long currentUserId) {
        if (posts.isEmpty()) {
            return PageResponse.of(posts.map(p -> postMapper.toResponse(p, InteractionCounts.EMPTY, UserInteractions.EMPTY, 0L, 0L, false)));
        }
        List<Long> postIds = posts.stream().map(Post::getId).toList();
        Map<Long, InteractionCounts> countsMap = interactionService.getCountsForPosts(postIds);
        Map<Long, UserInteractions> userMap = interactionService.getUserInteractionsForPosts(postIds, currentUserId);
        Map<Long, Long> replyCountsMap = postService.getReplyCounts(postIds);

        Map<Long, Long> repostCountsMap = repostService.getRepostCounts(postIds);
        Set<Long> repostedByMeSet = repostService.getRepostedByMe(currentUserId, postIds);

        return PageResponse.of(posts.map(post -> postMapper.toResponse(
            post,
            countsMap.getOrDefault(post.getId(), InteractionCounts.EMPTY),
            userMap.getOrDefault(post.getId(), UserInteractions.EMPTY),
            replyCountsMap.getOrDefault(post.getId(), 0L),
            repostCountsMap.getOrDefault(post.getId(), 0L),
            repostedByMeSet.contains(post.getId())
        )));
    }

    private List<PostResponse> enrichList(List<Post> posts, Long currentUserId) {
        if (posts.isEmpty()) {
            return List.of();
        }
        List<Long> postIds = posts.stream().map(Post::getId).toList();
        Map<Long, InteractionCounts> countsMap = interactionService.getCountsForPosts(postIds);
        Map<Long, UserInteractions> userMap = interactionService.getUserInteractionsForPosts(postIds, currentUserId);
        Map<Long, Long> replyCountsMap = postService.getReplyCounts(postIds);
        Map<Long, Long> repostCountsMap = repostService.getRepostCounts(postIds);
        Set<Long> repostedByMeSet = repostService.getRepostedByMe(currentUserId, postIds);

        return posts.stream().map(post -> postMapper.toResponse(
            post,
            countsMap.getOrDefault(post.getId(), InteractionCounts.EMPTY),
            userMap.getOrDefault(post.getId(), UserInteractions.EMPTY),
            replyCountsMap.getOrDefault(post.getId(), 0L),
            repostCountsMap.getOrDefault(post.getId(), 0L),
            repostedByMeSet.contains(post.getId())
        )).toList();
    }

    @Transactional(readOnly = true)
    public List<PostResponse> getAncestors(Long id) {
        return enrichList(postService.getAncestors(id), currentUserIdOrNull());
    }

    @Transactional
    public PostResponse create(CreatePostRequest request) {
        Account current = getCurrentAccount();
        postingPolicy.requireCanPost(current);
        requireAllowedImageUrl(request.imageUrl());

        Post post = postService.create(current.getId(), request.content(), request.imageUrl(), request.parentPostId());

        PostResponse response = postMapper.toResponse(post, InteractionCounts.EMPTY, UserInteractions.EMPTY, 0L, 0L, false);
        eventPublisher.publishEvent(new PostCreatedEvent(response));
        return response;
    }

    @Transactional
    public PostResponse update(Long id, UpdatePostRequest request) {
        Account current = getCurrentAccount();
        requireAllowedImageUrl(request.imageUrl());
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
        Page<Post> posts = postService.searchPosts(query, PageRequest.of(page, size));
        return enrichPage(posts, currentUserIdOrNull());
    }

    @Transactional(readOnly = true)
    public PostResponse getById(Long id) {
        return toEnriched(postService.getById(id), currentUserIdOrNull());
    }

    @Transactional(readOnly = true)
    public PostResponse getForBroadcast(Long postId) {
        Post post = postService.getEntityById(postId);
        return postMapper.toResponse(post, InteractionCounts.EMPTY, UserInteractions.EMPTY, 0L, 0L, false);
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getFeed(int page, int size) {
        Account current = getCurrentAccount();
        Page<Post> posts = postService.getFollowingFeed(current.getId(), PageRequest.of(page, size));
        return enrichPage(posts, current.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getExplore(int page, int size) {
        Page<Post> posts = postService.getExploreFeed(PageRequest.of(page, size));
        return enrichPage(posts, currentUserIdOrNull());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getProfileFeed(String username, int page, int size) {
        Account target = accountService.getAccount(username);
        Page<Post> posts = postService.getProfileFeed(target.getId(), PageRequest.of(page, size));
        return enrichPage(posts, currentUserIdOrNull());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getReplies(Long id, int page, int size) {
        Page<Post> posts = postService.getReplies(id, PageRequest.of(page, size));
        return enrichPage(posts, currentUserIdOrNull());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getProfileReplies(String username, int page, int size) {
        Account target = accountService.getAccount(username);
        Page<Post> posts = postService.getRepliesByAccount(target.getId(), PageRequest.of(page, size));
        return enrichPage(posts, currentUserIdOrNull());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getProfileLikes(String username, int page, int size) {
        Account target = accountService.getAccount(username);
        Page<Post> posts = postService.getLikedPostsByAccount(target.getId(), PageRequest.of(page, size));
        return enrichPage(posts, currentUserIdOrNull());
    }

    @Transactional(readOnly = true)
    public String uploadPostImage(MultipartFile file) {
        return storageService.uploadFile(file, "posts");
    }

    @Transactional
    public boolean toggleRepost(Long postId) {
        Account current = getCurrentAccount();
        postingPolicy.requireCanPost(current);
        Post post = postService.getById(postId);
        boolean isReposted = repostService.toggleRepost(current, post);

        if (isReposted) {
            PostResponse originalResponse = toEnriched(post, current.getId());
            eventPublisher.publishEvent(new RepostCreatedEvent(
                current.getId(),
                post.getAccount().getId(),
                post.getId(),
                originalResponse
            ));
        }

        return isReposted;
    }

    @Transactional
    public PostResponse quoteRepost(Long quotedPostId, CreateQuoteRepostRequest request) {
        Account current = getCurrentAccount();
        postingPolicy.requireCanPost(current);
        requireAllowedImageUrl(request.imageUrl());
        Post post = postService.createQuote(current.getId(), quotedPostId, request.content(), request.imageUrl());

        PostResponse response = postMapper.toResponse(post, InteractionCounts.EMPTY, UserInteractions.EMPTY, 0L, 0L, false);
        eventPublisher.publishEvent(new PostCreatedEvent(response));
        return response;
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getQuotes(Long postId, int page, int size) {
        Page<Post> posts = postService.getQuotes(postId, PageRequest.of(page, size));
        return enrichPage(posts, currentUserIdOrNull());
    }

    private PageResponse<FeedItemResponse> enrichFeedPage(Page<FeedItemProjection> projections, Long currentUserId) {
        if (projections.isEmpty()) {
            return PageResponse.of(Page.empty());
        }

        List<Long> postIds = projections.stream()
            .map(FeedItemProjection::getPostId)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();

        List<Long> actorIds = projections.stream()
            .filter(p -> "REPOST".equals(p.getType()))
            .map(FeedItemProjection::getActorId)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();

        if (postIds.isEmpty()) {
            return PageResponse.of(Page.empty());
        }

        // 1. Postları Toplu Çek
        Map<Long, Post> postMap = postService.getPostsByIds(postIds).stream()
            .collect(Collectors.toMap(Post::getId, p -> p, (a, b) -> a));

        // 2. Metrikleri Toplu Çek
        Map<Long, InteractionCounts> countsMap = interactionService.getCountsForPosts(postIds);
        Map<Long, UserInteractions> userMap = interactionService.getUserInteractionsForPosts(postIds, currentUserId);
        Map<Long, Long> replyCountsMap = postService.getReplyCounts(postIds);
        Map<Long, Long> repostCountsMap = repostService.getRepostCounts(postIds);
        Set<Long> repostedByMeSet = repostService.getRepostedByMe(currentUserId, postIds);

        // 3. Reposter Hesapları Toplu Çek (Sadece repostlar için)
        Map<Long, Account> reposterMap = actorIds.isEmpty() ? java.util.Collections.emptyMap() :
            accountService.getAccountsByIds(actorIds).stream()
                .collect(Collectors.toMap(Account::getId, a -> a, (a, b) -> a));

        // 4. Mapleyip Döndür
        List<FeedItemResponse> content = projections.stream().map(p -> {
            if (p.getPostId() == null) return null;

            Post post = postMap.get(p.getPostId());
            if (post == null) return null;

            PostResponse postResponse = postMapper.toResponse(
                post,
                countsMap.getOrDefault(post.getId(), InteractionCounts.EMPTY),
                userMap.getOrDefault(post.getId(), UserInteractions.EMPTY),
                replyCountsMap.getOrDefault(post.getId(), 0L),
                repostCountsMap.getOrDefault(post.getId(), 0L),
                repostedByMeSet.contains(post.getId())
            );

            PublicAccountResponse reposterResponse = null;
            if ("REPOST".equals(p.getType()) && p.getActorId() != null && reposterMap.containsKey(p.getActorId())) {
                reposterResponse = accountMapper.toPublicResponseNoFollow(reposterMap.get(p.getActorId()));
            }

            return new FeedItemResponse(
                p.getType(),
                p.getActionAt(),
                reposterResponse,
                postResponse
            );
        }).filter(java.util.Objects::nonNull).toList();

        return new PageResponse<>(
            content,
            projections.getNumber(),
            projections.getSize(),
            projections.getTotalElements(),
            projections.getTotalPages(),
            projections.isLast()
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<FeedItemResponse> getFeedUnion(int page, int size) {
        Account current = getCurrentAccount();
        Page<FeedItemProjection> projections = postService.getFollowingFeedUnion(current.getId(), PageRequest.of(page, size));
        return enrichFeedPage(projections, current.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<FeedItemResponse> getProfileFeedUnion(String username, int page, int size) {
        Account target = accountService.getAccount(username);
        Page<FeedItemProjection> projections = postService.getProfileFeedUnion(target.getId(), PageRequest.of(page, size));
        return enrichFeedPage(projections, currentUserIdOrNull());
    }
}
