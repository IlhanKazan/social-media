package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Account;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    /**
     * Broadcast audience: opted in, not deleted, and verified.
     *
     * Verification is part of the filter on purpose — mailing addresses nobody
     * has confirmed is how a sending domain collects bounces and ends up in a
     * spam folder for everyone else.
     */

    /**
     * Who a broadcast may go to.
     *
     * Bots are excluded because their addresses are seeded, not owned by anyone
     * who asked to hear from us — mail to them is quota spent on nobody, and on
     * a shared monthly allowance that is quota taken from password resets.
     *
     * Unverified addresses are excluded too: an address nobody has confirmed
     * may belong to someone who never signed up, and their first move on an
     * unexpected bulk mail is to report it as spam, which drags the sending
     * reputation down for the account mail that has to arrive.
     */
    @Query("SELECT COUNT(a) FROM Account a WHERE a.emailNotificationsEnabled = true "
        + "AND a.deletedAt IS NULL AND a.emailVerified = true AND a.role.name <> 'ROLE_BOT'")
    long countAnnouncementRecipients();

    @Query("SELECT a FROM Account a WHERE a.emailNotificationsEnabled = true "
        + "AND a.deletedAt IS NULL AND a.emailVerified = true AND a.role.name <> 'ROLE_BOT'")
    List<Account> findAnnouncementRecipients();

    Optional<Account> findByUsername(String username);
    Optional<Account> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    Page<Account> findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(String username, String displayName, Pageable pageable);

    Page<Account> findByUsernameStartingWith(String prefix, Pageable pageable);

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

    Page<Account> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(String username, String email, Pageable pageable);

    @Query("SELECT a FROM Account a WHERE " +
        "(:search IS NULL OR LOWER(a.username) LIKE :search OR LOWER(a.email) LIKE :search) AND " +
        "(:status IS NULL OR :status = 'all' OR (:status = 'banned' AND a.bannedAt IS NOT NULL) OR (:status = 'active' AND a.bannedAt IS NULL)) AND " +
        "(:verified IS NULL OR a.emailVerified = :verified) AND " +
        "(:roleName IS NULL OR a.role.name = :roleName)")
    Page<Account> findAdminUsers(
        @Param("search") String search,
        @Param("status") String status,
        @Param("verified") Boolean verified,
        @Param("roleName") String roleName,
        Pageable pageable
    );
    boolean existsByIdAndBannedAtIsNotNull(Long id);

    long countByBannedAtIsNotNull();

    List<Account> findByDeletedAtBefore(Instant cutoff);

    @Query("SELECT a FROM Account a WHERE a.role.name = :roleName AND a.deletedAt IS NULL AND a.bannedAt IS NULL")
    List<Account> findByRoleName(@Param("roleName") String roleName);
}
