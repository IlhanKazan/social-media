package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Account;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByUsername(String username);
    Optional<Account> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    Page<Account> findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(String username, String displayName, Pageable pageable);

    @Query(value = """
        SELECT a.* FROM accounts a
        WHERE a.deleted_at IS NULL
          AND a.id != :currentUserId
          AND a.id NOT IN (
              SELECT f.following_id FROM follows f WHERE f.follower_id = :currentUserId
          )
        ORDER BY (
            SELECT COUNT(*) FROM follows f2 WHERE f2.following_id = a.id
        ) DESC, a.created_at DESC
        LIMIT :limit
    """, nativeQuery = true)
    List<Account> findSuggestions(@Param("currentUserId") Long currentUserId, @Param("limit") int limit);

}
