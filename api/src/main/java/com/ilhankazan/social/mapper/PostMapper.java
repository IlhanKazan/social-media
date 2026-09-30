package com.ilhankazan.social.mapper;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.interaction.UserInteractions;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.entity.AdminStatus;
import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.entity.Post;
import jakarta.persistence.EntityNotFoundException;
import org.hibernate.Hibernate;
import org.hibernate.proxy.HibernateProxy;
import org.hibernate.proxy.LazyInitializer;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;

@Mapper(componentModel = "spring", uses = {AccountMapper.class})
public interface PostMapper {

    @Mapping(target = "author", source = "post.account", qualifiedByName = "noFollow")
    @Mapping(target = "parentPostId", source = "post.parentPost.id")
    @Mapping(target = "parentPostAuthorUsername", source = "post.parentPost", qualifiedByName = "parentAuthorUsername")
    @Mapping(target = "quotedPost", source = "post.quotedPost", qualifiedByName = "mapQuotedPost")
    @Mapping(target = "likeCount", source = "counts.likes")
    @Mapping(target = "dislikeCount", source = "counts.dislikes")
    @Mapping(target = "replyCount", source = "replyCount")
    @Mapping(target = "repostCount", source = "repostCount")
    @Mapping(target = "likedByMe", source = "userInteractions.liked")
    @Mapping(target = "dislikedByMe", source = "userInteractions.disliked")
    @Mapping(target = "repostedByMe", source = "repostedByMe")
    @Mapping(target = "isEdited", source = "post.edited")
    @Mapping(target = "moderationStatus", source = "post.moderationStatus")
    @Mapping(target = "adminStatus", source = "post.adminStatus")
    PostResponse toResponse(Post post, InteractionCounts counts, UserInteractions userInteractions, long replyCount, long repostCount, boolean repostedByMe);

    @Named("mapQuotedPost")
    default PostResponse mapQuotedPost(Post quotedPost) {
        if (quotedPost == null) return null;

        boolean isDeleted = isGone(quotedPost);
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        boolean isAuthor = !isDeleted && quotedPost.getAccount().getUsername().equals(currentUsername);

        boolean isFlagged = !isDeleted && quotedPost.getModerationStatus() == ModerationStatus.FLAGGED;
        boolean isInactive = !isDeleted && quotedPost.getAdminStatus() != AdminStatus.ACTIVE;

        if (isDeleted || ((isFlagged || isInactive) && !isAuthor)) {
            var dummyAuthor = new PublicAccountResponse(
                0L, "gizli", "Gizlenmiş Kullanıcı", null, null, null, 50, 0L, 0L, false, false, Instant.now()
            );

            return new PostResponse(
                idOf(quotedPost),
                "Bu gönderi topluluk kuralları ihlali veya silinme sebebiyle gösterilemiyor.",
                null, dummyAuthor, null, null, null, 0L, 0L, 0L, 0L, false, false, false, false,
                isDeleted ? ModerationStatus.CLEAN : quotedPost.getModerationStatus(),
                isDeleted ? AdminStatus.ACTIVE : quotedPost.getAdminStatus(),
                isDeleted ? Instant.now() : quotedPost.getCreatedAt(),
                0L
            );
        }

        return toResponse(quotedPost, InteractionCounts.EMPTY, UserInteractions.EMPTY, 0L, 0L, false);
    }

    @Named("parentAuthorUsername")
    default String parentAuthorUsername(Post parentPost) {
        if (parentPost == null || isGone(parentPost)) return null;
        return parentPost.getAccount().getUsername();
    }

    private static Long idOf(Post post) {
        LazyInitializer lazy = HibernateProxy.extractLazyInitializer(post);
        return lazy != null ? (Long) lazy.getIdentifier() : post.getId();
    }

    // A lazy proxy to a soft-deleted post throws on first access, because @SQLRestriction hides the row.
    private static boolean isGone(Post post) {
        try {
            Hibernate.initialize(post);
            return post.getDeletedAt() != null;
        } catch (EntityNotFoundException e) {
            return true;
        }
    }
}
