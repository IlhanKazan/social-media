package com.ilhankazan.social.dto.admin;

import java.time.Instant;

public record AdminAccountResponse(
    Long id,
    String username,
    String email,
    String displayName,
    String profileImageUrl,
    String role,
    boolean emailVerified,
    Instant joinedAt,
    Instant lastLoginAt,
    long postCount,
    boolean isBanned
) {}
