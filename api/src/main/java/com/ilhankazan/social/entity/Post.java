package com.ilhankazan.social.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "posts")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
public class Post extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_post_id")
    private Post parentPost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quoted_post_id")
    private Post quotedPost;

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", nullable = false)
    private ModerationStatus moderationStatus = ModerationStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "admin_status", nullable = false)
    private AdminStatus adminStatus = AdminStatus.ACTIVE;

    @Column(name = "moderated_at")
    private Instant moderatedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "moderation_categories", columnDefinition = "jsonb")
    private Map<String, Double> moderationCategories;

    @Column(name = "moderation_provider", length = 32)
    private String moderationProvider;

    @Column(name = "moderation_attempts", nullable = false)
    private int moderationAttempts = 0;

    @Column(name = "is_edited", nullable = false)
    private boolean isEdited = false;
}
