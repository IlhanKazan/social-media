package com.ilhankazan.social.repository;

// Single source of truth for the post-visibility predicate (moderation + admin
// gate) shared across PostRepository. Referenced via compile-time concatenation
// in @Query so a change here propagates to every feed/search/profile query.
//
// Fail-closed model: a post is publicly visible only when moderation_status =
// 'CLEAN' and it has not been removed by an admin. PENDING/FLAGGED are visible
// only to the author (owner exception). REMOVED_BY_ADMIN is hidden from everyone
// including the author; RESTORED_BY_ADMIN is treated as visible (an admin chose
// to keep it), hence the admin gate is 'admin_status <> REMOVED_BY_ADMIN', not
// '= ACTIVE'.
final class PostVisibility {

    private PostVisibility() {}

    static final String PUBLIC_JPQL =
        "p.moderationStatus = 'CLEAN' AND p.adminStatus <> 'REMOVED_BY_ADMIN'";

    static final String PUBLIC_SQL =
        "p.moderation_status = 'CLEAN' AND p.admin_status <> 'REMOVED_BY_ADMIN'";

    static final String OWNER_JPQL =
        "p.adminStatus <> 'REMOVED_BY_ADMIN' AND (p.moderationStatus = 'CLEAN' OR p.account.id = :currentUserId)";

    static final String OWNER_SQL =
        "p.admin_status <> 'REMOVED_BY_ADMIN' AND (p.moderation_status = 'CLEAN' OR p.account_id = :currentUserId)";

    static final String OWNER_PARENT_JPQL =
        "parent.adminStatus <> 'REMOVED_BY_ADMIN' AND (parent.moderationStatus = 'CLEAN' OR parent.account.id = :currentUserId)";
}
