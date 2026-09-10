package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.MfaChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface MfaChallengeRepository extends JpaRepository<MfaChallenge, Long> {

    Optional<MfaChallenge> findByTokenId(String tokenId);

    @Modifying
    @Query("UPDATE MfaChallenge c SET c.consumedAt = CURRENT_TIMESTAMP "
        + "WHERE c.account.id = :accountId AND c.consumedAt IS NULL")
    void consumeActiveForAccount(@Param("accountId") Long accountId);

    /**
     * Single-use has to be won atomically, not by read-then-write: six concurrent verifications of
     * one challenge each saw consumed_at IS NULL and five of them minted a session. The row lock
     * this UPDATE takes serialises them, and only the winner sees a non-zero count.
     */
    @Modifying
    @Query("UPDATE MfaChallenge c SET c.consumedAt = CURRENT_TIMESTAMP "
        + "WHERE c.tokenId = :tokenId AND c.consumedAt IS NULL")
    int consumeIfActive(@Param("tokenId") String tokenId);

    @Modifying
    @Query("UPDATE MfaChallenge c SET c.failedAttempts = c.failedAttempts + 1 WHERE c.tokenId = :tokenId")
    void incrementFailedAttempts(@Param("tokenId") String tokenId);

    @Modifying
    @Query("UPDATE MfaChallenge c SET c.consumedAt = CURRENT_TIMESTAMP "
        + "WHERE c.tokenId = :tokenId AND c.consumedAt IS NULL AND c.failedAttempts >= :maxAttempts")
    void burnIfAttemptsExhausted(@Param("tokenId") String tokenId, @Param("maxAttempts") int maxAttempts);

    /**
     * Failures across every challenge in the window, so re-logging in for a fresh challenge does
     * not reset the count. Bounded by created_at rather than the challenge lifetime because a
     * locked challenge is consumed immediately and would otherwise drop out of the sum.
     */
    @Query("SELECT COALESCE(SUM(c.failedAttempts), 0) FROM MfaChallenge c "
        + "WHERE c.account.id = :accountId AND c.createdAt >= :since")
    long countRecentFailures(@Param("accountId") Long accountId, @Param("since") Instant since);
}
