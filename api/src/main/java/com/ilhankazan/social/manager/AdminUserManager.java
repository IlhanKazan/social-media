package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.admin.AdminAccountResponse;
import com.ilhankazan.social.dto.admin.AdminUserDetailResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.event.UserBannedEvent;
import com.ilhankazan.social.mapper.AdminAccountMapper;
import com.ilhankazan.social.service.AdminUserService;
import com.ilhankazan.social.service.LoginHistoryService;
import com.ilhankazan.social.service.PostService;
import com.ilhankazan.social.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminUserManager {

    private final AdminUserService adminUserService;
    private final RefreshTokenService refreshTokenService;
    private final LoginHistoryService loginHistoryService;
    private final PostService postService;
    private final AuthManager authManager;
    private final ApplicationEventPublisher eventPublisher;
    private final AdminAuditManager adminAuditManager;
    private final AdminAccountMapper adminAccountMapper;

    @Transactional(readOnly = true)
    public PageResponse<AdminAccountResponse> getUsers(int page, int size, String search, String status, Boolean verified, String role) {
        Page<AdminAccountResponse> accountPage = adminUserService.getUsers(page, size, search, status, verified, role)
            .map(account -> {
                Instant lastLogin = loginHistoryService.getLastLoginDate(account.getId());
                long postCount = postService.countPostsByAccountId(account.getId());
                return adminAccountMapper.toResponse(account, lastLogin, postCount);
            });

        return PageResponse.of(accountPage);
    }

    @Transactional(readOnly = true)
    public AdminUserDetailResponse getUserDetail(Long accountId) {
        Account account = adminUserService.getUserById(accountId);

        Instant lastLogin = loginHistoryService.getLastLoginDate(account.getId());
        long postCount = postService.countPostsByAccountId(account.getId());

        var recentLogins = loginHistoryService.getRecentLogins(accountId, 10)
            .stream().map(AdminUserDetailResponse.LoginHistoryDto::from).toList();

        var recentAudits = adminAuditManager.getRecentTargetAuditsDto(accountId, "ACCOUNT", 10);
        int sessionCount = refreshTokenService.countActiveSessionsForAccount(accountId);

        AdminAccountResponse baseResponse = adminAccountMapper.toResponse(account, lastLogin, postCount);

        return new AdminUserDetailResponse(baseResponse, sessionCount, recentAudits, recentLogins);
    }

    @Transactional
    public void banUser(Long accountId, String reason) {
        Account target = adminUserService.getUserById(accountId);

        adminUserService.banUser(accountId, reason);
        adminAuditManager.logAction("USER_BANNED", "ACCOUNT", accountId, Map.of("reason", reason));

        refreshTokenService.revokeAllForAccount(accountId);
        eventPublisher.publishEvent(new UserBannedEvent(accountId, target.getUsername(), reason));
    }

    @Transactional
    public void unbanUser(Long accountId) {
        adminUserService.unbanUser(accountId);
        adminAuditManager.logAction("USER_UNBANNED", "ACCOUNT", accountId, null);
    }

    @Transactional
    public void forceLogout(Long accountId) {
        refreshTokenService.revokeAllForAccount(accountId);
        adminAuditManager.logAction("FORCE_LOGOUT", "ACCOUNT", accountId, null);
    }

    @Transactional
    public void promoteUser(Long accountId) {
        adminUserService.updateRole(accountId, "ROLE_ADMIN");
        adminAuditManager.logAction("ROLE_GRANTED", "ACCOUNT", accountId, Map.of("role", "ROLE_ADMIN"));
    }

    @Transactional
    public void demoteUser(Long accountId) {
        adminUserService.updateRole(accountId, "ROLE_USER");
        adminAuditManager.logAction("ROLE_REVOKED", "ACCOUNT", accountId, Map.of("role", "ROLE_ADMIN"));
    }

    @Transactional
    public void resetPassword(Long accountId) {
        Account target = adminUserService.getUserById(accountId);
        authManager.requestPasswordReset(target.getEmail(), "127.0.0.1");
        adminAuditManager.logAction("ADMIN_INITIATED_RESET", "ACCOUNT", accountId, null);
    }

}
