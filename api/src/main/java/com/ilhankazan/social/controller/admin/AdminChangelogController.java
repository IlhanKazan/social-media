package com.ilhankazan.social.controller.admin;

import com.ilhankazan.social.dto.changelog.ChangelogAdminResponse;
import com.ilhankazan.social.dto.changelog.ChangelogEntryRequest;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.manager.ChangelogManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/changelog")
@RequiredArgsConstructor
public class AdminChangelogController {

    private final ChangelogManager changelogManager;

    @GetMapping
    public ResponseEntity<PageResponse<ChangelogAdminResponse>> list(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(changelogManager.getAll(page, Math.min(size, 50)));
    }

    @PostMapping
    public ResponseEntity<ChangelogAdminResponse> create(@Valid @RequestBody ChangelogEntryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(changelogManager.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChangelogAdminResponse> update(
        @PathVariable Long id, @Valid @RequestBody ChangelogEntryRequest request) {
        return ResponseEntity.ok(changelogManager.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        changelogManager.delete(id);
        return ResponseEntity.noContent().build();
    }
}
