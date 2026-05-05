package com.ilhankazan.social.dto.account;

import java.time.Instant;

public record PublicAccountResponse(
    Long id,
    String username,
    String displayName,
    String bio,
    String profileImageUrl,
    String coverImageUrl,
    long followerCount,
    long followingCount,
    boolean isFollowing,
    boolean emailVerified,
    Instant joinedAt
) {}
