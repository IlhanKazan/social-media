package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop10ByTargetIdAndTargetTypeOrderByCreatedAtDesc(Long targetId, String targetType);

    @Query("SELECT a FROM AuditLog a WHERE " +
        "(:action IS NULL OR a.action = :action) AND " +
        "(:actorId IS NULL OR a.actor.id = :actorId) AND " +
        "(:targetType IS NULL OR a.targetType = :targetType) AND " +
        "(:targetId IS NULL OR a.targetId = :targetId)")
    Page<AuditLog> findFiltered(
        @Param("action") String action,
        @Param("actorId") Long actorId,
        @Param("targetType") String targetType,
        @Param("targetId") Long targetId,
        Pageable pageable
    );
}
