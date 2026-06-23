package com.ilhankazan.social.dto.account;

import java.time.Instant;

public record MyAccountResponse(
    Long id,
    String username,
    String email,
    String phone,
    String displayName,
    String bio,
    String profileImageUrl,
    String coverImageUrl,
    int coverPosition,
    String role,
    boolean emailVerified,
    boolean mfaEmailEnabled,
    Instant joinedAt
) {}
