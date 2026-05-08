package com.ilhankazan.social.mapper;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.interaction.UserInteractions;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.entity.AdminStatus;
import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.entity.Post;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;

@Mapper(componentModel = "spring", uses = {AccountMapper.class})
public interface PostMapper {

    @Mapping(target = "author", source = "post.account", qualifiedByName = "noFollow")
    @Mapping(target = "parentPostId", source = "post.parentPost.id")
    @Mapping(target = "parentPostAuthorUsername", source = "post.parentPost.account.username")
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

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        boolean isAuthor = quotedPost.getAccount().getUsername().equals(currentUsername);

        boolean isDeleted = quotedPost.getDeletedAt() != null;
        boolean isFlagged = quotedPost.getModerationStatus() == ModerationStatus.FLAGGED;
        boolean isInactive = quotedPost.getAdminStatus() != AdminStatus.ACTIVE;

        if (isDeleted || ((isFlagged || isInactive) && !isAuthor)) {
            var dummyAuthor = new PublicAccountResponse(
                0L, "gizli", "Gizlenmiş Kullanıcı", null, null, null, 0L, 0L, false, false, Instant.now()
            );

            return new PostResponse(
                quotedPost.getId(),
                "Bu gönderi topluluk kuralları ihlali veya silinme sebebiyle gösterilemiyor.",
                null, dummyAuthor, null, null, null, 0L, 0L, 0L, 0L, false, false, false, false,
                quotedPost.getModerationStatus(),
                quotedPost.getAdminStatus(),
                quotedPost.getCreatedAt()
            );
        }

        return toResponse(quotedPost, InteractionCounts.EMPTY, UserInteractions.EMPTY, 0L, 0L, false);
    }
}
