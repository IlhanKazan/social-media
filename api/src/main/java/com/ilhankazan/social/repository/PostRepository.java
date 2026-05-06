package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.repository.projection.FeedItemProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("SELECT p FROM Post p WHERE p.account.id = :accountId AND p.parentPost IS NULL")
    Page<Post> findByAccountIdAndParentPostIsNull(@Param("accountId") Long accountId, Pageable pageable);

    @Query(value = "SELECT p.* FROM posts p WHERE (p.account_id IN (SELECT f.following_id FROM follows f WHERE f.follower_id = :userId) OR p.account_id = :userId) AND p.parent_post_id IS NULL AND p.deleted_at IS NULL",
           countQuery = "SELECT count(*) FROM posts p WHERE (p.account_id IN (SELECT f.following_id FROM follows f WHERE f.follower_id = :userId) OR p.account_id = :userId) AND p.parent_post_id IS NULL AND p.deleted_at IS NULL",
           nativeQuery = true)
    Page<Post> findFollowingFeed(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.parentPost.id = :parentPostId AND p.deletedAt IS NULL ORDER BY p.createdAt ASC")
    Page<Post> findReplies(@Param("parentPostId") Long parentPostId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.parentPost IS NULL ORDER BY p.createdAt DESC")
    Page<Post> findAllTopLevelPosts(Pageable pageable);

    @Modifying
    @Query("UPDATE Post p SET p.deletedAt = CURRENT_TIMESTAMP WHERE p.account.id = :accountId AND p.deletedAt IS NULL")
    void softDeleteByAccountId(@Param("accountId") Long accountId);

    interface PostCountRow {
        Long getPostId();
        Long getCount();
    }

    @Query("SELECT p.parentPost.id AS postId, COUNT(p) AS count FROM Post p WHERE p.parentPost.id IN :postIds AND p.deletedAt IS NULL GROUP BY p.parentPost.id")
    List<PostCountRow> countRepliesForPosts(@Param("postIds") List<Long> postIds);

    @Modifying
    @Query("UPDATE Post p SET p.deletedAt = CURRENT_TIMESTAMP WHERE p.parentPost.id = :parentPostId AND p.deletedAt IS NULL")
    void softDeleteRepliesByParentId(@Param("parentPostId") Long parentPostId);

    @Query("SELECT p FROM Post p WHERE LOWER(p.content) LIKE LOWER(CONCAT('%', :query, '%')) AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
    Page<Post> searchPosts(@Param("query") String query, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.account.id = :accountId AND p.parentPost IS NOT NULL AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
    Page<Post> findRepliesByAccountId(@Param("accountId") Long accountId, Pageable pageable);

    @Query("SELECT p FROM Post p JOIN Interaction i ON i.post = p WHERE i.account.id = :accountId AND i.type = com.ilhankazan.social.entity.InteractionType.LIKE AND p.deletedAt IS NULL AND i.deletedAt IS NULL ORDER BY i.createdAt DESC")
    Page<Post> findLikedPostsByAccountId(@Param("accountId") Long accountId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.quotedPost.id = :quotedPostId AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
    Page<Post> findQuotes(@Param("quotedPostId") Long quotedPostId, Pageable pageable);


    @Query(value = """
        SELECT * FROM (
            SELECT id AS "postId", CAST('POST' AS VARCHAR) AS "type", created_at AS "actionAt", account_id AS "actorId"
            FROM posts
            WHERE account_id = :accountId AND parent_post_id IS NULL AND deleted_at IS NULL
            UNION ALL
            SELECT post_id AS "postId", CAST('REPOST' AS VARCHAR) AS "type", created_at AS "actionAt", account_id AS "actorId"
            FROM reposts
            WHERE account_id = :accountId AND deleted_at IS NULL
        ) AS combined_feed
        ORDER BY "actionAt" DESC
    """, countQuery = """
        SELECT COUNT(*) FROM (
            SELECT id FROM posts WHERE account_id = :accountId AND parent_post_id IS NULL AND deleted_at IS NULL
            UNION ALL
            SELECT post_id FROM reposts WHERE account_id = :accountId AND deleted_at IS NULL
        ) AS count_feed
    """, nativeQuery = true)
    Page<FeedItemProjection> getProfileFeedUnion(@Param("accountId") Long accountId, Pageable pageable);

    @Query(value = """
        SELECT * FROM (
            SELECT id AS "postId", CAST('POST' AS VARCHAR) AS "type", created_at AS "actionAt", account_id AS "actorId"
            FROM posts
            WHERE (account_id IN (SELECT following_id FROM follows WHERE follower_id = :userId) OR account_id = :userId)
              AND parent_post_id IS NULL AND deleted_at IS NULL
            UNION ALL
            SELECT post_id AS "postId", CAST('REPOST' AS VARCHAR) AS "type", created_at AS "actionAt", account_id AS "actorId"
            FROM reposts
            WHERE (account_id IN (SELECT following_id FROM follows WHERE follower_id = :userId) OR account_id = :userId)
              AND deleted_at IS NULL
        ) AS combined_feed
        ORDER BY "actionAt" DESC
    """, countQuery = """
        SELECT COUNT(*) FROM (
            SELECT id FROM posts WHERE (account_id IN (SELECT following_id FROM follows WHERE follower_id = :userId) OR account_id = :userId) AND parent_post_id IS NULL AND deleted_at IS NULL
            UNION ALL
            SELECT post_id FROM reposts WHERE (account_id IN (SELECT following_id FROM follows WHERE follower_id = :userId) OR account_id = :userId) AND deleted_at IS NULL
        ) AS count_feed
    """, nativeQuery = true)
    Page<FeedItemProjection> getFollowingFeedUnion(@Param("userId") Long userId, Pageable pageable);
}
