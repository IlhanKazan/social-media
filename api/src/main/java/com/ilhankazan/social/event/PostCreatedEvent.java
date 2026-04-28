package com.ilhankazan.social.event;

import com.ilhankazan.social.dto.post.PostResponse;

public record PostCreatedEvent(
    PostResponse post
) {
}
