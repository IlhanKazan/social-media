package com.ilhankazan.social.dto.changelog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangelogEntryRequest(
    // Matches the app version scheme so an entry can be tied to a release.
    @NotBlank @Size(max = 32)
    @Pattern(regexp = "^[0-9]+\\.[0-9]+\\.[0-9]+$", message = "Must be a semantic version, e.g. 1.2.0")
    String version,

    @NotBlank @Size(max = 200) String titleTr,
    @NotBlank @Size(max = 200) String titleEn,
    @NotBlank @Size(max = 8000) String bodyTr,
    @NotBlank @Size(max = 8000) String bodyEn,

    /** Publishes immediately when true; otherwise the entry stays a draft. */
    boolean published
) {}
