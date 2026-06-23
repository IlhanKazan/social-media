package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.MfaRecoveryCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MfaRecoveryCodeRepository extends JpaRepository<MfaRecoveryCode, Long> {

    Optional<MfaRecoveryCode> findByAccountIdAndCodeHashAndUsedAtIsNull(Long accountId, String codeHash);

    @Modifying
    @Query("DELETE FROM MfaRecoveryCode r WHERE r.account.id = :accountId")
    void deleteAllForAccount(@Param("accountId") Long accountId);
}
