package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.PostRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
}
