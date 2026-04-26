package com.ilhankazan.social.dto.account;

import java.time.Instant;

public record AccountResponse(
    String username,
    String displayName,
    String bio,
    String profileImageUrl,
    String coverImageUrl,
    Instant joinedAt
) {}
