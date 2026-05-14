package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.AdminStatus;
import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.repository.projection.FeedItemProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    @Query(value = "SELECT p.* FROM posts p WHERE (p.account_id IN (SELECT f.following_id FROM follows f WHERE f.follower_id = :userId) OR p.account_id = :userId) " +
        "AND p.parent_post_id IS NULL AND p.deleted_at IS NULL AND p.moderation_status IN ('PENDING', 'CLEAN') AND p.admin_status = 'ACTIVE'",
        countQuery = "SELECT count(*) FROM posts p WHERE (p.account_id IN (SELECT f.following_id FROM follows f WHERE f.follower_id = :userId) OR p.account_id = :userId) " +
            "AND p.parent_post_id IS NULL AND p.deleted_at IS NULL AND p.moderation_status IN ('PENDING', 'CLEAN') AND p.admin_status = 'ACTIVE'",
        nativeQuery = true)
    Page<Post> findFollowingFeed(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.parentPost.id = :parentPostId AND p.deletedAt IS NULL " +
        "AND p.moderationStatus IN ('PENDING', 'CLEAN') AND p.adminStatus = 'ACTIVE' ORDER BY p.createdAt ASC")
    Page<Post> findReplies(@Param("parentPostId") Long parentPostId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.parentPost IS NULL AND p.deletedAt IS NULL " +
        "AND p.moderationStatus IN ('PENDING', 'CLEAN') AND p.adminStatus = 'ACTIVE' ORDER BY p.createdAt DESC")
    Page<Post> findAllTopLevelPosts(Pageable pageable);

    @Modifying
    @Query("UPDATE Post p SET p.deletedAt = CURRENT_TIMESTAMP WHERE p.account.id = :accountId AND p.deletedAt IS NULL")
    void softDeleteByAccountId(@Param("accountId") Long accountId);

    interface PostCountRow {
        Long getPostId();
        Long getCount();
    }

    @Query("SELECT p.parentPost.id AS postId, COUNT(p) AS count FROM Post p WHERE p.parentPost.id IN :postIds AND p.deletedAt IS NULL " +
        "AND p.moderationStatus IN ('PENDING', 'CLEAN') AND p.adminStatus = 'ACTIVE' GROUP BY p.parentPost.id")
    List<PostCountRow> countRepliesForPosts(@Param("postIds") List<Long> postIds);

    @Modifying
    @Query("UPDATE Post p SET p.deletedAt = CURRENT_TIMESTAMP WHERE p.parentPost.id = :parentPostId AND p.deletedAt IS NULL")
    void softDeleteRepliesByParentId(@Param("parentPostId") Long parentPostId);

    @Query("SELECT p FROM Post p WHERE LOWER(p.content) LIKE LOWER(CONCAT('%', :query, '%')) AND p.deletedAt IS NULL " +
        "AND p.moderationStatus IN ('PENDING', 'CLEAN') AND p.adminStatus = 'ACTIVE' ORDER BY p.createdAt DESC")
    Page<Post> searchPosts(@Param("query") String query, Pageable pageable);

    @Query("SELECT p FROM Post p JOIN Interaction i ON i.post = p " +
        "LEFT JOIN p.parentPost parent " +
        "WHERE i.account.id = :accountId AND i.type = com.ilhankazan.social.entity.InteractionType.LIKE " +
        "AND p.deletedAt IS NULL AND i.deletedAt IS NULL " +
        "AND (p.moderationStatus IN ('PENDING', 'CLEAN') AND p.adminStatus = 'ACTIVE' OR p.account.id = :currentUserId) " +
        "AND (parent IS NULL OR (parent.deletedAt IS NULL AND parent.adminStatus = 'ACTIVE' AND (parent.moderationStatus IN ('PENDING', 'CLEAN') OR parent.account.id = :currentUserId))) " +
        "ORDER BY i.createdAt DESC")
    Page<Post> findLikedPostsByAccountId(@Param("accountId") Long accountId, @Param("currentUserId") Long currentUserId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.quotedPost.id = :quotedPostId AND p.deletedAt IS NULL " +
        "AND p.moderationStatus IN ('PENDING', 'CLEAN') AND p.adminStatus = 'ACTIVE' ORDER BY p.createdAt DESC")
    Page<Post> findQuotes(@Param("quotedPostId") Long quotedPostId, Pageable pageable);

    @Query(value = """
        SELECT * FROM (
            SELECT p.id AS "postId", CAST('POST' AS VARCHAR) AS "type", p.created_at AS "actionAt", p.account_id AS "actorId"
            FROM posts p
            WHERE (p.account_id IN (SELECT f.following_id FROM follows f WHERE f.follower_id = :userId) OR p.account_id = :userId)
              AND p.parent_post_id IS NULL AND p.deleted_at IS NULL
              AND p.moderation_status IN ('PENDING', 'CLEAN') AND p.admin_status = 'ACTIVE'
            UNION ALL
            SELECT r.post_id AS "postId", CAST('REPOST' AS VARCHAR) AS "type", r.created_at AS "actionAt", r.account_id AS "actorId"
            FROM reposts r
            JOIN posts p ON r.post_id = p.id
            WHERE (r.account_id IN (SELECT f.following_id FROM follows f WHERE f.follower_id = :userId) OR r.account_id = :userId)
              AND r.deleted_at IS NULL
              AND p.deleted_at IS NULL AND p.moderation_status IN ('PENDING', 'CLEAN') AND p.admin_status = 'ACTIVE'
        ) AS combined_feed
        ORDER BY "actionAt" DESC
    """, countQuery = """
        SELECT COUNT(*) FROM (
            SELECT p.id FROM posts p WHERE (p.account_id IN (SELECT f.following_id FROM follows f WHERE f.follower_id = :userId) OR p.account_id = :userId) AND p.parent_post_id IS NULL AND p.deleted_at IS NULL AND p.moderation_status IN ('PENDING', 'CLEAN') AND p.admin_status = 'ACTIVE'
            UNION ALL
            SELECT r.post_id FROM reposts r JOIN posts p ON r.post_id = p.id WHERE (r.account_id IN (SELECT f.following_id FROM follows f WHERE f.follower_id = :userId) OR r.account_id = :userId) AND r.deleted_at IS NULL AND p.deleted_at IS NULL AND p.moderation_status IN ('PENDING', 'CLEAN') AND p.admin_status = 'ACTIVE'
        ) AS count_feed
    """, nativeQuery = true)
    Page<FeedItemProjection> getFollowingFeedUnion(@Param("userId") Long userId, Pageable pageable);

    long countByModerationStatusAndCreatedAtAfter(ModerationStatus status, Instant since);

    @Query("SELECT p FROM Post p WHERE p.moderationStatus = 'PENDING' AND p.deletedAt IS NULL AND p.createdAt < :cutoff")
    List<Post> findPendingPostsOlderThan(@Param("cutoff") Instant cutoff, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.account.id = :accountId AND p.parentPost IS NULL " +
        "AND p.deletedAt IS NULL AND p.adminStatus = 'ACTIVE' " +
        "AND (p.moderationStatus IN ('PENDING', 'CLEAN') OR p.account.id = :currentUserId)")
    Page<Post> findByAccountIdAndParentPostIsNull(@Param("accountId") Long accountId, @Param("currentUserId") Long currentUserId, Pageable pageable);

    @Query("SELECT p FROM Post p JOIN p.parentPost parent " +
        "WHERE p.account.id = :accountId AND p.deletedAt IS NULL AND parent.deletedAt IS NULL " +
        "AND ( (p.moderationStatus IN ('PENDING', 'CLEAN') AND p.adminStatus = 'ACTIVE') OR p.account.id = :currentUserId ) " +
        "AND ( (parent.moderationStatus IN ('PENDING', 'CLEAN') AND parent.adminStatus = 'ACTIVE') OR parent.account.id = :currentUserId ) " +
        "ORDER BY p.createdAt DESC")
    Page<Post> findRepliesByAccountId(@Param("accountId") Long accountId, @Param("currentUserId") Long currentUserId, Pageable pageable);

    @Query(value = """
        SELECT * FROM (
            SELECT p.id AS "postId", CAST('POST' AS VARCHAR) AS "type", p.created_at AS "actionAt", p.account_id AS "actorId"
            FROM posts p
            WHERE p.account_id = :accountId AND p.parent_post_id IS NULL AND p.deleted_at IS NULL
              AND p.admin_status = 'ACTIVE' AND (p.moderation_status IN ('PENDING', 'CLEAN') OR p.account_id = :currentUserId)
            UNION ALL
            SELECT r.post_id AS "postId", CAST('REPOST' AS VARCHAR) AS "type", r.created_at AS "actionAt", r.account_id AS "actorId"
            FROM reposts r
            JOIN posts p ON r.post_id = p.id
            WHERE r.account_id = :accountId AND r.deleted_at IS NULL
              AND p.deleted_at IS NULL AND p.admin_status = 'ACTIVE' AND (p.moderation_status IN ('PENDING', 'CLEAN') OR p.account_id = :currentUserId)
        ) AS combined_feed
        ORDER BY "actionAt" DESC
    """, countQuery = """
        SELECT COUNT(*) FROM (
            SELECT p.id FROM posts p WHERE p.account_id = :accountId AND p.parent_post_id IS NULL AND p.deleted_at IS NULL AND p.admin_status = 'ACTIVE' AND (p.moderation_status IN ('PENDING', 'CLEAN') OR p.account_id = :currentUserId)
            UNION ALL
            SELECT r.post_id FROM reposts r JOIN posts p ON r.post_id = p.id WHERE r.account_id = :accountId AND r.deleted_at IS NULL AND p.deleted_at IS NULL AND p.admin_status = 'ACTIVE' AND (p.moderation_status IN ('PENDING', 'CLEAN') OR p.account_id = :currentUserId)
        ) AS count_feed
    """, nativeQuery = true)
    Page<FeedItemProjection> getProfileFeedUnion(@Param("accountId") Long accountId, @Param("currentUserId") Long currentUserId, Pageable pageable);

    long countByAccountIdAndDeletedAtIsNull(Long accountId);

    Page<Post> findByModerationStatusAndAdminStatusAndDeletedAtIsNull(
        ModerationStatus moderationStatus,
        AdminStatus adminStatus,
        Pageable pageable
    );

    long countByAdminStatus(AdminStatus status);

    @Query("SELECT p FROM Post p WHERE p.account.id = :accountId AND p.imageUrl IS NOT NULL")
    List<Post> findPostsWithImagesByAccountId(@Param("accountId") Long accountId);

    long countByModerationStatusAndAdminStatus(ModerationStatus modStatus, AdminStatus adminStatus);

}
