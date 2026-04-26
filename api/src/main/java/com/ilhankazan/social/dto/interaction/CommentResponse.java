package com.ilhankazan.social.dto.interaction;

import com.ilhankazan.social.dto.account.PublicAccountResponse;

import java.time.Instant;

public record CommentResponse(
    Long id,
    String content,
    PublicAccountResponse author,
    Instant createdAt
) {}