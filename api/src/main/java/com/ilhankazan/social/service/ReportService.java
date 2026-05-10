package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.entity.Report;
import com.ilhankazan.social.repository.ReportRepository;
import com.ilhankazan.social.repository.projection.ReportGroupProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;

    @Transactional
    public Report create(Post post, Account reporter, String reason, String details) {
        Report report = new Report();
        report.setPost(post);
        report.setReporter(reporter);
        report.setReason(reason);
        report.setDetails(details);
        if (post.getAccount().getId().equals(reporter.getId())) {
            throw new IllegalArgumentException("Kendi gönderinizi şikayet edemezsiniz.");
        }
        return reportRepository.save(report);
    }

    @Transactional(readOnly = true)
    public List<Report> getReportsByReporterId(Long reporterId) {
        return reportRepository.findByReporterIdOrderByCreatedAtDesc(reporterId);
    }

    @Transactional(readOnly = true)
    public Page<ReportGroupProjection> getOpenReportsGrouped(Pageable pageable) {
        return reportRepository.findOpenReportsGrouped(pageable);
    }

    @Transactional
    public void resolveReportsForPost(Long postId, String resolution, Long adminId) {
        reportRepository.resolveAllByPostId(postId, resolution, adminId);
    }

    public long countOpenReports(){
        return reportRepository.countByResolvedAtIsNull();
    }
}
