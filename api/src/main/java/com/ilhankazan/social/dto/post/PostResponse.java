package com.ilhankazan.social.dto.post;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import java.time.Instant;

public record PostResponse(
    Long id,
    String content,
    String imageUrl,
    PublicAccountResponse author,
    Long parentPostId,
    long likeCount,
    long dislikeCount,
    long commentCount,
    boolean likedByMe,
    boolean dislikedByMe,
    Instant createdAt
) {}
