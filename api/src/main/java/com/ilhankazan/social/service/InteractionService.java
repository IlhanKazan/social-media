package com.ilhankazan.social.service;

import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.interaction.InteractionStatusResponse;
import com.ilhankazan.social.dto.interaction.UserInteractions;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Interaction;
import com.ilhankazan.social.entity.InteractionType;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.repository.InteractionRepository;
import com.ilhankazan.social.repository.InteractionRepository.CountRow;
import com.ilhankazan.social.repository.InteractionRepository.UserReactionRow;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InteractionService {

    private static final List<InteractionType> REACTION_TYPES =
        List.of(InteractionType.LIKE, InteractionType.DISLIKE);

    private final InteractionRepository interactionRepository;

    @Transactional
    public InteractionStatusResponse toggleReaction(Account account, Post post, InteractionType type) {
        Optional<Interaction> existingLike =
            interactionRepository.findByAccountIdAndPostIdAndType(account.getId(), post.getId(), InteractionType.LIKE);
        Optional<Interaction> existingDislike =
            interactionRepository.findByAccountIdAndPostIdAndType(account.getId(), post.getId(), InteractionType.DISLIKE);

        if (type == InteractionType.LIKE) {
            if (existingLike.isPresent()) {
                existingLike.get().softDelete();
                interactionRepository.save(existingLike.get());
            } else {
                existingDislike.ifPresent(d -> { d.softDelete(); interactionRepository.save(d); });
                createReaction(account, post, InteractionType.LIKE);
            }
        } else {
            if (existingDislike.isPresent()) {
                existingDislike.get().softDelete();
                interactionRepository.save(existingDislike.get());
            } else {
                existingLike.ifPresent(l -> { l.softDelete(); interactionRepository.save(l); });
                createReaction(account, post, InteractionType.DISLIKE);
            }
        }

        return buildStatus(account.getId(), post.getId());
    }

    @Transactional
    public Interaction addComment(Account account, Post post, String content) {
        Interaction comment = new Interaction();
        comment.setAccount(account);
        comment.setPost(post);
        comment.setType(InteractionType.COMMENT);
        comment.setContent(content);
        return interactionRepository.save(comment);
    }

    @Transactional
    public void deleteComment(Account account, boolean isAdmin, Long commentId, Long postId) {
        Interaction comment = interactionRepository.findById(commentId)
            .orElseThrow(() -> new EntityNotFoundException("Comment not found"));

        if (!comment.getPost().getId().equals(postId)) {
            throw new EntityNotFoundException("Comment not found in this post");
        }
        if (comment.getType() != InteractionType.COMMENT) {
            throw new EntityNotFoundException("Interaction is not a comment");
        }
        if (!isAdmin && !comment.getAccount().getId().equals(account.getId())) {
            throw new AccessDeniedException("You can only delete your own comments");
        }

        comment.softDelete();
        interactionRepository.save(comment);
    }

    @Transactional(readOnly = true)
    public Page<Interaction> getComments(Long postId, Pageable pageable) {
        return interactionRepository.findCommentsByPostId(postId, pageable);
    }

    @Transactional(readOnly = true)
    public Map<Long, InteractionCounts> getCountsForPosts(List<Long> postIds) {
        if (postIds.isEmpty()) return Collections.emptyMap();

        List<CountRow> rows = interactionRepository.countByPostIds(postIds);

        Map<Long, Map<InteractionType, Long>> grouped = new HashMap<>();
        for (CountRow row : rows) {
            grouped.computeIfAbsent(row.getPostId(), k -> new EnumMap<>(InteractionType.class))
                   .put(row.getType(), row.getCount());
        }

        Map<Long, InteractionCounts> result = new HashMap<>();
        for (Long postId : postIds) {
            Map<InteractionType, Long> c = grouped.getOrDefault(postId, Collections.emptyMap());
            result.put(postId, new InteractionCounts(
                c.getOrDefault(InteractionType.LIKE, 0L),
                c.getOrDefault(InteractionType.DISLIKE, 0L),
                c.getOrDefault(InteractionType.COMMENT, 0L)
            ));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Map<Long, UserInteractions> getUserInteractionsForPosts(List<Long> postIds, Long userId) {
        if (postIds.isEmpty()) return Collections.emptyMap();

        List<UserReactionRow> rows =
            interactionRepository.findUserReactionsForPosts(userId, postIds, REACTION_TYPES);

        Map<Long, UserInteractions> result = new HashMap<>();
        for (UserReactionRow row : rows) {
            Long postId = row.getPostId();
            result.merge(
                postId,
                new UserInteractions(
                    row.getType() == InteractionType.LIKE,
                    row.getType() == InteractionType.DISLIKE),
                (a, b) -> new UserInteractions(a.liked() || b.liked(), a.disliked() || b.disliked())
            );
        }
        return result;
    }

    private void createReaction(Account account, Post post, InteractionType type) {
        Interaction reaction = new Interaction();
        reaction.setAccount(account);
        reaction.setPost(post);
        reaction.setType(type);
        interactionRepository.save(reaction);
    }

    private InteractionStatusResponse buildStatus(Long accountId, Long postId) {
        List<Long> ids = List.of(postId);
        InteractionCounts counts = getCountsForPosts(ids).getOrDefault(postId, InteractionCounts.EMPTY);
        UserInteractions ui = getUserInteractionsForPosts(ids, accountId).getOrDefault(postId, UserInteractions.EMPTY);
        return new InteractionStatusResponse(ui.liked(), ui.disliked(), counts.likes(), counts.dislikes());
    }
}