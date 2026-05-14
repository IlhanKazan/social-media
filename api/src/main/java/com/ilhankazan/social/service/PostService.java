package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.AdminStatus;
import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.event.PostNeedsModerationEvent;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.PostRepository;
import com.ilhankazan.social.repository.projection.FeedItemProjection;
import com.ilhankazan.social.security.CustomUserDetails;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import static java.util.stream.Collectors.toMap;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final AccountRepository accountRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public Post create(Long accountId, String content, String imageUrl, Long parentPostId) {
        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> new EntityNotFoundException("Account not found"));

        Post parentPost = null;
        if (parentPostId != null) {
            parentPost = postRepository.findById(parentPostId)
                .orElseThrow(() -> new EntityNotFoundException("Parent post not found"));
        }

        Post post = new Post();
        post.setAccount(account);
        post.setContent(content);
        post.setImageUrl(imageUrl);
        post.setParentPost(parentPost);

        post = postRepository.save(post);
        eventPublisher.publishEvent(new PostNeedsModerationEvent(post.getId()));
        return post;
    }

    @Transactional
    public Post update(Long accountId, Long postId, String content, String imageUrl) {
        Post post = getById(postId);
        if (!post.getAccount().getId().equals(accountId)) {
            throw new AccessDeniedException("You can only update your own posts");
        }

        boolean contentChanged = !post.getContent().equals(content);

        post.setContent(content);
        if (imageUrl != null) {
            post.setImageUrl(imageUrl);
        }

        if (contentChanged) {
            post.setEdited(true);
            post.setModerationStatus(ModerationStatus.PENDING);
            post.setModerationAttempts(0);
            post.setModerationProvider(null);
            post.setModerationCategories(null);
            post = postRepository.save(post);

            eventPublisher.publishEvent(new PostNeedsModerationEvent(post.getId()));
        } else {
            post = postRepository.save(post);
        }

        return post;
    }

    @Transactional(readOnly = true)
    public Post getById(Long postId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new EntityNotFoundException("Post not found"));

        if (post.getModerationStatus() == ModerationStatus.FLAGGED) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String currentUsername = authentication.getName();

            boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

            if (!isAdmin && !post.getAccount().getUsername().equals(currentUsername)) {
                throw new EntityNotFoundException("Post not found");
            }
        }

        return post;
    }

    @Transactional
    public void softDelete(Long accountId, boolean isAdmin, Long postId) {
        Post post = getById(postId);
        if (!isAdmin && !post.getAccount().getId().equals(accountId)) {
            throw new AccessDeniedException("You can only delete your own posts");
        }
        post.softDelete();
        postRepository.save(post);
    }

    @Transactional
    public void softDeleteUserPosts(Long accountId) {
        postRepository.softDeleteByAccountId(accountId);
    }

    @Transactional
    public void softDeleteReplies(Long parentPostId) {
        postRepository.softDeleteRepliesByParentId(parentPostId);
    }

    @Transactional(readOnly = true)
    public Page<Post> searchPosts(String query, Pageable pageable) {
        return postRepository.searchPosts(query, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Post> getProfileFeed(Long accountId, Pageable pageable) {
        return postRepository.findByAccountIdAndParentPostIsNull(accountId, getCurrentUserIdOrNull(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<Post> getFollowingFeed(Long userId, Pageable pageable) {
        return postRepository.findFollowingFeed(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Post> getExploreFeed(Pageable pageable) {
        return postRepository.findAllTopLevelPosts(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Post> getReplies(Long parentPostId, Pageable pageable) {
        return postRepository.findReplies(parentPostId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Post> getRepliesByAccount(Long accountId, Pageable pageable) {
        return postRepository.findRepliesByAccountId(accountId, getCurrentUserIdOrNull(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<Post> getLikedPostsByAccount(Long accountId, Pageable pageable) {
        return postRepository.findLikedPostsByAccountId(accountId, getCurrentUserIdOrNull(), pageable);
    }

    @Transactional(readOnly = true)
    public Map<Long, Long> getReplyCounts(List<Long> postIds) {
        if (postIds.isEmpty()) return java.util.Collections.emptyMap();
        return postRepository.countRepliesForPosts(postIds).stream()
            .collect(toMap(
                PostRepository.PostCountRow::getPostId,
                PostRepository.PostCountRow::getCount
            ));
    }

    @Transactional
    public Post createQuote(Long accountId, Long quotedPostId, String content, String imageUrl) {
        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> new EntityNotFoundException("Account not found"));

        Post quotedPost = postRepository.findById(quotedPostId)
            .orElseThrow(() -> new EntityNotFoundException("Quoted post not found"));

        Post post = new Post();
        post.setAccount(account);
        post.setContent(content == null ? "" : content);
        post.setImageUrl(imageUrl);
        post.setQuotedPost(quotedPost);

        post = postRepository.save(post);
        eventPublisher.publishEvent(new PostNeedsModerationEvent(post.getId()));
        return post;
    }

    @Transactional(readOnly = true)
    public Page<Post> getQuotes(Long quotedPostId, Pageable pageable) {
        return postRepository.findQuotes(quotedPostId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Post> getPostsByIds(List<Long> postIds) {
        if (postIds == null || postIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return postRepository.findAllById(postIds);
    }

    @Transactional(readOnly = true)
    public Page<FeedItemProjection> getFollowingFeedUnion(Long userId, Pageable pageable) {
        return postRepository.getFollowingFeedUnion(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<FeedItemProjection> getProfileFeedUnion(Long accountId, Pageable pageable) {
        return postRepository.getProfileFeedUnion(accountId, getCurrentUserIdOrNull(), pageable);
    }

    @Transactional
    public Post updateModerationResult(Long postId, com.ilhankazan.social.entity.ModerationStatus status, String provider, java.util.Map<String, Double> categories) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new EntityNotFoundException("Post not found"));
        post.setModerationStatus(status);
        post.setModerationProvider(provider);
        post.setModerationCategories(categories);
        post.setModeratedAt(java.time.Instant.now());
        return postRepository.save(post);
    }

    @Transactional(readOnly = true)
    public long countFlaggedPostsSince(java.time.Instant since) {
        return postRepository.countByModerationStatusAndCreatedAtAfter(com.ilhankazan.social.entity.ModerationStatus.FLAGGED, since);
    }

    @Transactional(readOnly = true)
    public List<Post> getPendingPostsOlderThan(java.time.Instant cutoff, int limit) {
        return postRepository.findPendingPostsOlderThan(cutoff, org.springframework.data.domain.PageRequest.of(0, limit));
    }

    @Transactional
    public void handleModerationFailure(Long postId) {
        Post post = getById(postId);
        post.setModerationAttempts(post.getModerationAttempts() + 1);

        if (post.getModerationAttempts() >= 3) {
            post.setModerationStatus(ModerationStatus.CLEAN);
            post.setModerationProvider("FALLBACK_AUTO_PASS");
            post.setModeratedAt(java.time.Instant.now());
        }
        postRepository.save(post);
    }

    private Long getCurrentUserIdOrNull() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() &&
            authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getId();
        }
        return null;
    }

    @Transactional(readOnly = true)
    public Page<Post> getModerationQueue(Pageable pageable) {
        return postRepository.findByModerationStatusAndAdminStatusAndDeletedAtIsNull(
            ModerationStatus.FLAGGED,
            AdminStatus.ACTIVE,
            pageable
        );
    }

    @Transactional
    public Post updateAdminAndModerationStatus(Long postId, AdminStatus adminStatus, ModerationStatus modStatus) {
        Post post = getById(postId);
        post.setAdminStatus(adminStatus);
        if (modStatus != null) {
            post.setModerationStatus(modStatus);
        }
        return postRepository.save(post);
    }

    @Transactional(readOnly = true)
    public long countTotalPosts() {
        return postRepository.count();
    }

    @Transactional(readOnly = true)
    public long countByModerationStatus(ModerationStatus status, java.time.Instant since) {
        return postRepository.countByModerationStatusAndCreatedAtAfter(status, since);
    }

    @Transactional(readOnly = true)
    public long countByAdminStatus(AdminStatus status) {
        return postRepository.countByAdminStatus(status);
    }

    @Transactional(readOnly = true)
    public long countPostsByAccountId(Long accountId) {
        return postRepository.countByAccountIdAndDeletedAtIsNull(accountId);
    }

    @Transactional(readOnly = true)
    public long countByModerationStatusAndAdminStatus(ModerationStatus moderationStatus, AdminStatus adminStatus){
        return postRepository.countByModerationStatusAndAdminStatus(moderationStatus, adminStatus);
    }
}
