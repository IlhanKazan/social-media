package com.ilhankazan.social.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;

@Entity
@Table(name = "changelog_entries")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangelogEntry extends BaseEntity {

    @Column(nullable = false, length = 32)
    private String version;

    @Column(name = "title_tr", nullable = false, length = 200)
    private String titleTr;

    @Column(name = "title_en", nullable = false, length = 200)
    private String titleEn;

    @Column(name = "body_tr", nullable = false, columnDefinition = "TEXT")
    private String bodyTr;

    @Column(name = "body_en", nullable = false, columnDefinition = "TEXT")
    private String bodyEn;

    /** Null while the entry is a draft; set when it becomes publicly visible. */
    @Column(name = "published_at")
    private Instant publishedAt;

    public boolean isPublished() {
        return publishedAt != null;
    }

    public String title(String language) {
        return "en".equalsIgnoreCase(language) ? titleEn : titleTr;
    }

    public String body(String language) {
        return "en".equalsIgnoreCase(language) ? bodyEn : bodyTr;
    }
}
