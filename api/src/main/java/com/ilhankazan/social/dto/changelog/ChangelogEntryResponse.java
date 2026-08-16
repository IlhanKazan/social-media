package com.ilhankazan.social.dto.changelog;

import java.time.Instant;

/** One release note, already resolved to the reader's language. */
public record ChangelogEntryResponse(
    Long id,
    String version,
    String title,
    String body,
    Instant publishedAt
) {}
