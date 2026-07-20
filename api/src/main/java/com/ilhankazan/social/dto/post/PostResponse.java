package com.ilhankazan.social.dto.post;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.entity.AdminStatus;
import com.ilhankazan.social.entity.ModerationStatus;

import java.time.Instant;

public record PostResponse(
    Long id,
    String content,
    String imageUrl,
    PublicAccountResponse author,
    Long parentPostId,
    String parentPostAuthorUsername,
    PostResponse quotedPost,
    long likeCount,
    long dislikeCount,
    long replyCount,
    long repostCount,
    boolean likedByMe,
    boolean dislikedByMe,
    boolean repostedByMe,
    boolean isEdited,
    ModerationStatus moderationStatus,
    AdminStatus adminStatus,
    Instant createdAt,
    long viewCount
) {}
