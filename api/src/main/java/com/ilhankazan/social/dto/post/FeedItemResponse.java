package com.ilhankazan.social.dto.post;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import java.time.Instant;

public record FeedItemResponse(
    String type,
    Instant repostedAt,
    PublicAccountResponse reposter,
    PostResponse post
) {}
