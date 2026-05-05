package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE PasswordResetToken p SET p.usedAt = CURRENT_TIMESTAMP WHERE p.account.id = :accountId AND p.usedAt IS NULL")
    void invalidateActiveTokensForAccount(@Param("accountId") Long accountId);

    @Modifying
    int deleteByExpiresAtBefore(Instant cutoff);
}
