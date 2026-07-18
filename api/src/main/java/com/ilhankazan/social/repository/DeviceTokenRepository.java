package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    Optional<DeviceToken> findByToken(String token);

    List<DeviceToken> findByAccountId(Long accountId);

    @Query(value = """
        SELECT DISTINCT d.account_id FROM device_tokens d
        JOIN accounts a ON a.id = d.account_id
        WHERE d.deleted_at IS NULL AND a.deleted_at IS NULL AND a.banned_at IS NULL
          AND d.account_id NOT IN (
            SELECT n.recipient_id FROM notifications n
            WHERE n.type = 'RECOMMENDATION' AND n.created_at > :cooldownCutoff
          )
        LIMIT :limit
        """, nativeQuery = true)
    List<Long> findRecommendationRecipients(@Param("cooldownCutoff") Instant cooldownCutoff, @Param("limit") int limit);
}
