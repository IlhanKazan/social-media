package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Report;
import com.ilhankazan.social.repository.projection.ReportGroupProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByReporterIdOrderByCreatedAtDesc(Long reporterId);

    @Query("SELECT r.post.id AS postId, COUNT(r.id) AS reportCount, MAX(r.createdAt) AS latestReportedAt " +
        "FROM Report r WHERE r.resolvedAt IS NULL " +
        "GROUP BY r.post.id ORDER BY COUNT(r.id) DESC")
    Page<ReportGroupProjection> findOpenReportsGrouped(Pageable pageable);

    @Modifying
    @Query("UPDATE Report r SET r.resolvedAt = CURRENT_TIMESTAMP, r.resolution = :resolution, r.resolvedBy.id = :adminId " +
        "WHERE r.post.id = :postId AND r.resolvedAt IS NULL")
    void resolveAllByPostId(Long postId, String resolution, Long adminId);

    long countByResolvedAtIsNull();
}
