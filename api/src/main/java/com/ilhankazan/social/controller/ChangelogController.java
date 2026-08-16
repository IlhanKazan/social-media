package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.changelog.ChangelogEntryResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.manager.ChangelogManager;
import com.ilhankazan.social.security.RateLimit;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public release notes. Also the target of the mobile update prompt's changelog link. */
@RestController
@RequestMapping("/api/v1/changelog")
@RequiredArgsConstructor
public class ChangelogController {

    private final ChangelogManager changelogManager;

    @RateLimit(capacity = 60, minutes = 1)
    @GetMapping
    public ResponseEntity<PageResponse<ChangelogEntryResponse>> list(
        @RequestParam(defaultValue = "tr") String lang,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(changelogManager.getPublished(lang, page, Math.min(size, 50)));
    }
}
