package com.ilhankazan.social.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "reports")
@Getter
@Setter
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private Account reporter;

    @Column(nullable = false, length = 64)
    private String reason;

    @Column(length = 500)
    private String details;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by_id")
    private Account resolvedBy;

    @Column(length = 32)
    private String resolution;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

}
