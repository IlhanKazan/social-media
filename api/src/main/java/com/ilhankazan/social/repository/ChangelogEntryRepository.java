package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.ChangelogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChangelogEntryRepository extends JpaRepository<ChangelogEntry, Long> {

    /** The public list: published entries only, newest release first. */
    Page<ChangelogEntry> findByPublishedAtIsNotNullOrderByPublishedAtDesc(Pageable pageable);

    /** Admin list, drafts included. */
    Page<ChangelogEntry> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<ChangelogEntry> findByVersion(String version);
}
