package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.admin.AdminMetricsResponse;
import com.ilhankazan.social.entity.AdminStatus;
import com.ilhankazan.social.entity.EmailStatus;
import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.service.*;
import com.ilhankazan.social.service.email.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
public class AdminMetricsManager {

    private final AccountService accountService;
    private final PostService postService;
    private final ReportService reportService;
    private final RefreshTokenService refreshTokenService;
    private final EmailService emailService;

    public AdminMetricsResponse getMetrics() {
        Instant startOfDay = Instant.now().truncatedTo(ChronoUnit.DAYS);

        return new AdminMetricsResponse(
            new AdminMetricsResponse.UserMetrics(
                accountService.countTotalAccounts(),
                accountService.countBannedAccounts()
            ),
            new AdminMetricsResponse.PostMetrics(
                postService.countTotalPosts(),
                postService.countByModerationStatusAndAdminStatus(ModerationStatus.FLAGGED, AdminStatus.ACTIVE),
                postService.countByAdminStatus(AdminStatus.REMOVED_BY_ADMIN)
            ),
            reportService.countOpenReports(),
            refreshTokenService.countActiveSessions(),
            new AdminMetricsResponse.EmailMetrics(
                0,
                emailService.countByStatusSince(EmailStatus.SENT, startOfDay),
                emailService.countByStatusSince(EmailStatus.FAILED, Instant.EPOCH)
            )
        );
    }
}
