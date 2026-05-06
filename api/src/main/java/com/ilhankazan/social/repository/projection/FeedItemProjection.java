package com.ilhankazan.social.repository.projection;

import java.time.Instant;

public interface FeedItemProjection {
    Long getPostId();
    String getType();
    Instant getActionAt();
    Long getActorId();
}
