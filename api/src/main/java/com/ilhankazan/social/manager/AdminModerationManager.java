package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.interaction.UserInteractions;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.entity.AdminStatus;
import com.ilhankazan.social.entity.ModerationStatus;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.event.PostModerationDecidedEvent;
import com.ilhankazan.social.mapper.PostMapper;
import com.ilhankazan.social.repository.projection.ReportGroupProjection;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.AuditLogService;
import com.ilhankazan.social.service.PostService;
import com.ilhankazan.social.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class AdminModerationManager {

    private final PostService postService;
    private final PostMapper postMapper;
    private final AuditLogService auditLogService;
    private final ApplicationEventPublisher eventPublisher;
    private final AccountService accountService;
    private final ReportService reportService;
    private final AdminUserManager adminUserManager;

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getModerationQueue(int page, int size) {
        Page<Post> flaggedPosts = postService.getModerationQueue(
            PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "createdAt"))
        );

        return PageResponse.of(flaggedPosts.map(post ->
            postMapper.toResponse(post, InteractionCounts.EMPTY, UserInteractions.EMPTY, 0L, 0L, false)
        ));
    }

    @Transactional
    public void approvePost(Long postId) {
        Post post = postService.updateAdminAndModerationStatus(postId, AdminStatus.RESTORED_BY_ADMIN, ModerationStatus.CLEAN);

        auditLogService.record("POST_RESTORED_BY_ADMIN", "POST", postId, null);

        eventPublisher.publishEvent(new PostModerationDecidedEvent(postId, post.getAccount().getUsername(), ModerationStatus.CLEAN));
    }

    @Transactional
    public void removePost(Long postId) {
        Post post = postService.updateAdminAndModerationStatus(postId, AdminStatus.REMOVED_BY_ADMIN, null);

        auditLogService.record("POST_REMOVED_BY_ADMIN", "POST", postId, null);

        eventPublisher.publishEvent(new PostModerationDecidedEvent(postId, post.getAccount().getUsername(), ModerationStatus.FLAGGED));
    }

    @Transactional(readOnly = true)
    public PageResponse<ReportGroupProjection> getGroupedReports(int page, int size) {
        Page<ReportGroupProjection> reports = reportService.getOpenReportsGrouped(PageRequest.of(page, size));
        return PageResponse.of(reports);
    }

    @Transactional
    public void resolveReport(Long postId, String resolution, boolean removePost, boolean banUser) {
        String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        Long adminId = accountService.getAccount(adminUsername).getId();

        reportService.resolveReportsForPost(postId, resolution, adminId);

        if (removePost) {
            this.removePost(postId);
        }

        if (banUser) {
            Post post = postService.getById(postId);
            adminUserManager.banUser(post.getAccount().getId(), "Rapor sonucu: " + resolution);
        }

        auditLogService.record("REPORTS_RESOLVED", "POST", postId, Map.of("resolution", resolution, "banned", banUser));
    }
}
