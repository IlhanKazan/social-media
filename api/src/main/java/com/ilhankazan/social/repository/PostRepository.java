package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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

    @Modifying
    @Query("UPDATE Post p SET p.deletedAt = CURRENT_TIMESTAMP WHERE p.parentPost.id = :parentPostId AND p.deletedAt IS NULL")
    void softDeleteRepliesByParentId(@Param("parentPostId") Long parentPostId);

    @Query("SELECT p FROM Post p WHERE LOWER(p.content) LIKE LOWER(CONCAT('%', :query, '%')) AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
    Page<Post> searchPosts(@Param("query") String query, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.account.id = :accountId AND p.parentPost IS NOT NULL AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
    Page<Post> findRepliesByAccountId(@Param("accountId") Long accountId, Pageable pageable);

    @Query("SELECT p FROM Post p JOIN Interaction i ON i.post = p WHERE i.account.id = :accountId AND i.type = com.ilhankazan.social.entity.InteractionType.LIKE AND p.deletedAt IS NULL AND i.deletedAt IS NULL ORDER BY i.createdAt DESC")
    Page<Post> findLikedPostsByAccountId(@Param("accountId") Long accountId, Pageable pageable);
}
