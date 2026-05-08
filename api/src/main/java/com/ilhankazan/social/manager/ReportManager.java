package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.moderation.CreateReportRequest;
import com.ilhankazan.social.dto.moderation.ReportResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.entity.Report;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.PostService;
import com.ilhankazan.social.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportManager {

    private final ReportService reportService;
    private final PostService postService;
    private final AccountService accountService;

    private Account getCurrentAccount() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username);
    }

    @Transactional
    public void createReport(Long postId, CreateReportRequest request) {
        Account current = getCurrentAccount();
        Post post = postService.getById(postId);
        reportService.create(post, current, request.reason(), request.details());
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> getCurrentUserReports() {
        Account current = getCurrentAccount();
        List<Report> reports = reportService.getReportsByReporterId(current.getId());

        return reports.stream().map(report -> new ReportResponse(
            report.getId(),
            report.getPost().getId(),
            report.getReason(),
            report.getDetails(),
            report.getCreatedAt(),
            report.getResolvedAt(),
            report.getResolution()
        )).toList();
    }
}
