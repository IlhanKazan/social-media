package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.changelog.ChangelogAdminResponse;
import com.ilhankazan.social.dto.changelog.ChangelogEntryRequest;
import com.ilhankazan.social.dto.changelog.ChangelogEntryResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.entity.ChangelogEntry;
import com.ilhankazan.social.exception.AppException;
import com.ilhankazan.social.repository.ChangelogEntryRepository;
import com.ilhankazan.social.service.AuditLogService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ChangelogManager {

    private final ChangelogEntryRepository repository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public PageResponse<ChangelogEntryResponse> getPublished(String language, int page, int size) {
        Page<ChangelogEntry> entries =
            repository.findByPublishedAtIsNotNullOrderByPublishedAtDesc(PageRequest.of(page, size));
        return PageResponse.of(entries.map(entry -> new ChangelogEntryResponse(
            entry.getId(),
            entry.getVersion(),
            entry.title(language),
            entry.body(language),
            entry.getPublishedAt()
        )));
    }

    @Transactional(readOnly = true)
    public PageResponse<ChangelogAdminResponse> getAll(int page, int size) {
        Page<ChangelogEntry> entries = repository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        return PageResponse.of(entries.map(this::toAdminResponse));
    }

    @Transactional
    public ChangelogAdminResponse create(ChangelogEntryRequest request) {
        repository.findByVersion(request.version()).ifPresent(existing -> {
            throw new AppException(HttpStatus.CONFLICT, "VERSION_EXISTS",
                "A changelog entry already exists for version " + request.version());
        });

        ChangelogEntry entry = ChangelogEntry.builder()
            .version(request.version())
            .titleTr(request.titleTr())
            .titleEn(request.titleEn())
            .bodyTr(request.bodyTr())
            .bodyEn(request.bodyEn())
            .publishedAt(request.published() ? Instant.now() : null)
            .build();

        ChangelogEntry saved = repository.save(entry);
        auditLogService.record("CHANGELOG_CREATED", "CHANGELOG", saved.getId(), Map.of(
            "version", saved.getVersion(),
            "published", request.published()
        ));
        return toAdminResponse(saved);
    }

    @Transactional
    public ChangelogAdminResponse update(Long id, ChangelogEntryRequest request) {
        ChangelogEntry entry = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Changelog entry not found"));

        repository.findByVersion(request.version()).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new AppException(HttpStatus.CONFLICT, "VERSION_EXISTS",
                    "Another entry already uses version " + request.version());
            }
        });

        entry.setVersion(request.version());
        entry.setTitleTr(request.titleTr());
        entry.setTitleEn(request.titleEn());
        entry.setBodyTr(request.bodyTr());
        entry.setBodyEn(request.bodyEn());

        // Publishing stamps the moment; unpublishing clears it. Re-saving an
        // already published entry keeps its original date, so an edit to fix a
        // typo does not push it back to the top of the list.
        if (request.published() && !entry.isPublished()) {
            entry.setPublishedAt(Instant.now());
        } else if (!request.published()) {
            entry.setPublishedAt(null);
        }

        ChangelogEntry saved = repository.save(entry);
        auditLogService.record("CHANGELOG_UPDATED", "CHANGELOG", saved.getId(), Map.of(
            "version", saved.getVersion(),
            "published", request.published()
        ));
        return toAdminResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        ChangelogEntry entry = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Changelog entry not found"));
        entry.softDelete();
        repository.save(entry);
        auditLogService.record("CHANGELOG_DELETED", "CHANGELOG", id, Map.of("version", entry.getVersion()));
    }

    private ChangelogAdminResponse toAdminResponse(ChangelogEntry entry) {
        return new ChangelogAdminResponse(
            entry.getId(),
            entry.getVersion(),
            entry.getTitleTr(),
            entry.getTitleEn(),
            entry.getBodyTr(),
            entry.getBodyEn(),
            entry.getPublishedAt(),
            entry.getCreatedAt()
        );
    }
}
