package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.entity.Report;
import com.ilhankazan.social.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
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
}
