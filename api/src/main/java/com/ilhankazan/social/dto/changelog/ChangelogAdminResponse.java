package com.ilhankazan.social.dto.changelog;

import java.time.Instant;

/** Both languages plus draft state, for the admin editor. */
public record ChangelogAdminResponse(
    Long id,
    String version,
    String titleTr,
    String titleEn,
    String bodyTr,
    String bodyEn,
    Instant publishedAt,
    Instant createdAt
) {}
