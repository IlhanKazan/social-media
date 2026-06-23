package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.MfaCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MfaCodeRepository extends JpaRepository<MfaCode, Long> {

    Optional<MfaCode> findTopByAccountIdAndUsedAtIsNullOrderByCreatedAtDesc(Long accountId);

    @Modifying
    @Query("UPDATE MfaCode m SET m.usedAt = CURRENT_TIMESTAMP WHERE m.account.id = :accountId AND m.usedAt IS NULL")
    void invalidateActiveForAccount(@Param("accountId") Long accountId);
}
