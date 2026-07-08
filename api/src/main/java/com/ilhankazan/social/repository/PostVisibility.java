package com.ilhankazan.social.repository;

// Single source of truth for the post-visibility predicate (moderation + admin
// gate) shared across PostRepository. Referenced via compile-time concatenation
// in @Query so a change here propagates to every feed/search/profile query.
// Two owner-exception shapes exist and are preserved verbatim: Shape A requires
// admin_status = 'ACTIVE' even for the author, Shape B lets the author see their
// own post regardless of admin_status. Reconciling them is a Task 1 decision.
final class PostVisibility {

    private PostVisibility() {}

    static final String PUBLIC_JPQL =
        "p.moderationStatus IN ('PENDING', 'CLEAN') AND p.adminStatus = 'ACTIVE'";

    static final String PUBLIC_SQL =
        "p.moderation_status IN ('PENDING', 'CLEAN') AND p.admin_status = 'ACTIVE'";

    static final String OWNER_JPQL =
        "p.adminStatus = 'ACTIVE' AND (p.moderationStatus IN ('PENDING', 'CLEAN') OR p.account.id = :currentUserId)";

    static final String OWNER_SQL =
        "p.admin_status = 'ACTIVE' AND (p.moderation_status IN ('PENDING', 'CLEAN') OR p.account_id = :currentUserId)";

    static final String OWNER_PARENT_JPQL =
        "parent.adminStatus = 'ACTIVE' AND (parent.moderationStatus IN ('PENDING', 'CLEAN') OR parent.account.id = :currentUserId)";

    static final String OWNER_LENIENT_JPQL =
        "(p.moderationStatus IN ('PENDING', 'CLEAN') AND p.adminStatus = 'ACTIVE') OR p.account.id = :currentUserId";

    static final String OWNER_LENIENT_PARENT_JPQL =
        "(parent.moderationStatus IN ('PENDING', 'CLEAN') AND parent.adminStatus = 'ACTIVE') OR parent.account.id = :currentUserId";
}
