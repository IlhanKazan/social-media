package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.PostRepository;
import com.ilhankazan.social.repository.projection.FeedItemProjection;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
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

        return postRepository.save(post);
    }

    @Transactional
    public Post update(Long accountId, Long postId, String content, String imageUrl) {
        Post post = getById(postId);
        if (!post.getAccount().getId().equals(accountId)) {
            throw new AccessDeniedException("You can only update your own posts");
        }

        post.setContent(content);
        if (imageUrl != null) {
            post.setImageUrl(imageUrl);
        }

        return postRepository.save(post);
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
    public Post getById(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Post not found"));
    }

    @Transactional(readOnly = true)
    public Page<Post> getProfileFeed(Long accountId, Pageable pageable) {
        return postRepository.findByAccountIdAndParentPostIsNull(accountId, pageable);
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
        return postRepository.findRepliesByAccountId(accountId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Post> getLikedPostsByAccount(Long accountId, Pageable pageable) {
        return postRepository.findLikedPostsByAccountId(accountId, pageable);
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

        return postRepository.save(post);
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
        return postRepository.getProfileFeedUnion(accountId, pageable);
    }
}
