package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Repost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RepostRepository extends JpaRepository<Repost, Long> {

    Optional<Repost> findByAccountIdAndPostId(Long accountId, Long postId);

    @Modifying
    @Query("UPDATE Repost r SET r.deletedAt = CURRENT_TIMESTAMP WHERE r.account.id = :accountId AND r.deletedAt IS NULL")
    void softDeleteByAccountId(@Param("accountId") Long accountId);

    @Modifying
    @Query("UPDATE Repost r SET r.deletedAt = CURRENT_TIMESTAMP WHERE r.post.id = :postId AND r.deletedAt IS NULL")
    void softDeleteByPostId(@Param("postId") Long postId);

    interface RepostCountRow {
        Long getPostId();
        Long getCount();
    }

    @Query("SELECT r.post.id AS postId, COUNT(r) AS count FROM Repost r WHERE r.post.id IN :postIds AND r.deletedAt IS NULL GROUP BY r.post.id")
    List<RepostCountRow> countRepostsForPosts(@Param("postIds") List<Long> postIds);

    @Query("SELECT r.post.id FROM Repost r WHERE r.account.id = :accountId AND r.post.id IN :postIds AND r.deletedAt IS NULL")
    List<Long> findRepostedPostIdsByUser(@Param("accountId") Long accountId, @Param("postIds") List<Long> postIds);
}
