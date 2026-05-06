package com.ilhankazan.social.event;

import com.ilhankazan.social.dto.post.PostResponse;

public record RepostCreatedEvent(
    Long reposterId,
    Long originalPostAuthorId,
    Long originalPostId,
    PostResponse originalPostResponse
) {}
