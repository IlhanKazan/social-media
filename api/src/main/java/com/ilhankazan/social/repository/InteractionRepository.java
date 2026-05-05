package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Interaction;
import com.ilhankazan.social.entity.InteractionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InteractionRepository extends JpaRepository<Interaction, Long> {

    Optional<Interaction> findByAccountIdAndPostIdAndType(Long accountId, Long postId, InteractionType type);

    @Query("""
        SELECT i.post.id AS postId, i.type AS type, COUNT(i) AS count
        FROM Interaction i
        WHERE i.post.id IN :postIds
        GROUP BY i.post.id, i.type
        """)
    List<CountRow> countByPostIds(@Param("postIds") List<Long> postIds);

    @Query("""
        SELECT i.post.id AS postId, i.type AS type
        FROM Interaction i
        WHERE i.account.id = :userId
          AND i.post.id IN :postIds
          AND i.type IN :types
        """)
    List<UserReactionRow> findUserReactionsForPosts(
        @Param("userId") Long userId,
        @Param("postIds") List<Long> postIds,
        @Param("types") List<InteractionType> types
    );

    interface CountRow {
        Long getPostId();
        InteractionType getType();
        Long getCount();
    }

    interface UserReactionRow {
        Long getPostId();
        InteractionType getType();
    }

    @Modifying
    @Query("UPDATE Interaction i SET i.deletedAt = CURRENT_TIMESTAMP WHERE i.account.id = :accountId AND i.deletedAt IS NULL")
    void softDeleteByAccountId(@Param("accountId") Long accountId);

    @Modifying
    @Query("UPDATE Interaction i SET i.deletedAt = CURRENT_TIMESTAMP WHERE i.post.id = :postId AND i.deletedAt IS NULL")
    void softDeleteByPostId(@Param("postId") Long postId);
}
