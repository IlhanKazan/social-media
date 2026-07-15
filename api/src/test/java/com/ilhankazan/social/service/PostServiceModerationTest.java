package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.PostRepository;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PostServiceModerationTest {

    private final PostRepository postRepository = mock(PostRepository.class);
    private final AccountRepository accountRepository = mock(AccountRepository.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final PostService postService = new PostService(postRepository, accountRepository, eventPublisher);

    @Test
    void repeatedProviderFailureEndsFlaggedNeverAutoCleaned() {
        Post post = new Post();
        post.setModerationStatus(ModerationStatus.PENDING);
        post.setModerationAttempts(2);
        when(postRepository.findById(eq(1L))).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        ModerationStatus result = postService.handleModerationFailure(1L);

        assertThat(result).isEqualTo(ModerationStatus.FLAGGED);
        assertThat(post.getModerationStatus()).isEqualTo(ModerationStatus.FLAGGED);
        assertThat(post.getModerationProvider()).isEqualTo(PostService.FALLBACK_FLAG_PROVIDER);
        assertThat(post.getModeratedAt()).isNotNull();
    }

    @Test
    void singleFailureLeavesPostPending() {
        Post post = new Post();
        post.setModerationStatus(ModerationStatus.PENDING);
        post.setModerationAttempts(0);
        when(postRepository.findById(eq(2L))).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        ModerationStatus result = postService.handleModerationFailure(2L);

        assertThat(result).isEqualTo(ModerationStatus.PENDING);
        assertThat(post.getModerationAttempts()).isEqualTo(1);
        assertThat(post.getModerationProvider()).isNull();
    }
}
