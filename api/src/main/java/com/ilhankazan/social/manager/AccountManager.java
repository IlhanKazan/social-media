package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.account.ChangePasswordRequest;
import com.ilhankazan.social.dto.account.MyAccountResponse;
import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.account.TotpSetupResponse;
import com.ilhankazan.social.dto.account.UpdateProfileRequest;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.EmailVerificationToken;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.service.*;
import com.ilhankazan.social.service.email.EmailMessage;
import com.ilhankazan.social.service.email.EmailService;
import com.ilhankazan.social.service.email.EmailVerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.env.Environment;
import org.springframework.data.domain.Page;
import org.springframework.security.authentication.BadCredentialsException;
import com.ilhankazan.social.security.AuthCacheResolver;
import com.ilhankazan.social.security.SecretCipher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AccountManager {

    private final AccountService accountService;
    private final FollowService followService;
    private final AccountMapper accountMapper;
    private final InteractionService interactionService;
    private final PostService postService;
    private final EmailVerificationService emailVerificationService;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final Environment env;
    private final RefreshTokenService refreshTokenService;
    private final PasswordEncoder passwordEncoder;
    private final AuthCacheResolver authResolver;
    private final MfaEmailService mfaEmailService;
    private final TotpService totpService;
    private final MfaRecoveryService mfaRecoveryService;
    private final SecretCipher secretCipher;

    private String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private Long getCurrentAccountId() {
        return accountService.getAccount(currentUsername()).getId();
    }

    private Long currentAccountIdOrNull() {
        String username = authResolver.usernameOrNull();
        return username == null ? null : accountService.getAccount(username).getId();
    }

    public MyAccountResponse getCurrentUser() {
        Account account = accountService.getAccount(currentUsername());
        return accountMapper.toMyResponse(account);
    }

    @Cacheable(value = "publicProfilesByUsername", key = "#targetUsername + '-' + @auth.user()")
    public PublicAccountResponse getPublicProfile(String targetUsername) {
        Account targetAccount = accountService.getAccount(targetUsername);
        Long currentUserId = currentAccountIdOrNull();

        long followers = followService.getFollowerCount(targetAccount.getId());
        long following = followService.getFollowingCount(targetAccount.getId());
        boolean isFollowing = followService.isFollowing(currentUserId, targetAccount.getId());

        return accountMapper.toPublicResponse(targetAccount, followers, following, isFollowing);
    }

    public PageResponse<PublicAccountResponse> searchAccounts(String query, int page, int size) {
        Long currentUserId = currentAccountIdOrNull();
        Page<Account> accounts = accountService.searchAccountsRaw(query, page, size);

        if (accounts.isEmpty()) {
            return PageResponse.of(accounts.map(a -> accountMapper.toPublicResponse(a, 0L, 0L, false)));
        }

        List<Long> accountIds = accounts.stream().map(Account::getId).toList();

        Map<Long, Long> followersMap = followService.getFollowerCounts(accountIds);
        Map<Long, Long> followingMap = followService.getFollowingCounts(accountIds);
        Set<Long> followedByMeSet = followService.getFollowedByMe(currentUserId, accountIds);

        return PageResponse.of(accounts.map(account -> accountMapper.toPublicResponse(
            account,
            followersMap.getOrDefault(account.getId(), 0L),
            followingMap.getOrDefault(account.getId(), 0L),
            followedByMeSet.contains(account.getId())
        )));
    }

    @Transactional
    public void deleteAccount() {
        Account account = accountService.getAccount(currentUsername());
        Long accountId = account.getId();

        followService.deleteUserFollows(accountId);
        interactionService.softDeleteUserInteractions(accountId);
        postService.softDeleteUserPosts(accountId);
        accountService.softDeleteAccount(account);
    }

    @CacheEvict(value = {"publicProfilesByUsername", "suggestions"}, allEntries = true)
    @Transactional
    public MyAccountResponse updateProfile(UpdateProfileRequest request) {
        Account account = accountService.updateProfile(currentUsername(), request.displayName(), request.bio());
        return accountMapper.toMyResponse(account);
    }

    @Transactional
    public String updateAvatar(MultipartFile file) {
        Account account = accountService.updateAvatar(currentUsername(), file);
        return account.getProfileImageUrl();
    }

    @Transactional
    public String updateCover(MultipartFile file) {
        Account account = accountService.updateCover(currentUsername(), file);
        return account.getCoverImageUrl();
    }

    @Cacheable(value = "suggestions", key = "@auth.user()")
    public List<PublicAccountResponse> getSuggestions(int limit) {
        Long currentUserId = getCurrentAccountId();
        List<Account> suggestions = accountService.getSuggestions(currentUserId, Math.min(limit, 10));

        if (suggestions.isEmpty()) return List.of();

        List<Long> accountIds = suggestions.stream().map(Account::getId).toList();
        Map<Long, Long> followersMap = followService.getFollowerCounts(accountIds);
        Map<Long, Long> followingMap = followService.getFollowingCounts(accountIds);

        return suggestions.stream().map(account -> accountMapper.toPublicResponse(
            account,
            followersMap.getOrDefault(account.getId(), 0L),
            followingMap.getOrDefault(account.getId(), 0L),
            false
        )).toList();
    }

    @Transactional
    public void sendVerificationEmail() {
        Account account = accountService.getAccount(currentUsername());
        if (account.isEmailVerified()) return;

        String plainToken = emailVerificationService.createVerificationToken(account);

        String frontendOrigin = env.getProperty("FRONTEND_ORIGIN", "http://localhost:5173");
        String verifyLink = frontendOrigin + "/verify-email?token=" + plainToken;

        emailService.enqueue(new EmailMessage(
            account.getEmail(),
            "Verify your SocialHan email",
            "EMAIL_VERIFICATION",
            Map.of("verifyLink", verifyLink)
        ));
    }

    @CacheEvict(value = {"accountsByUsername", "publicProfilesByUsername"}, allEntries = true)
    @Transactional
    public void verifyEmail(String plainToken) {
        EmailVerificationToken token = emailVerificationService.validateAndConsumeToken(plainToken);
        Account account = token.getAccount();

        if (!account.isEmailVerified()) {
            account.setEmailVerified(true);
            account.setEmailVerifiedAt(Instant.now());
            accountService.saveRaw(account);

            auditLogService.record("EMAIL_VERIFIED", "ACCOUNT", account.getId(), null);
        }
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        Account account = accountService.getAccount(currentUsername());

        if (!passwordEncoder.matches(request.oldPassword(), account.getPassword())) {
            throw new BadCredentialsException("Mevcut şifreniz yanlış.");
        }

        account.setPassword(passwordEncoder.encode(request.newPassword()));
        accountService.saveRaw(account);

        refreshTokenService.revokeAllForAccount(account.getId());

        auditLogService.record("PASSWORD_CHANGED", "ACCOUNT", account.getId(), null);
    }

    @Transactional
    public void startEmailMfaSetup() {
        Account account = accountService.getAccount(currentUsername());
        if (!account.isEmailVerified()) {
            throw new IllegalArgumentException("İki adımlı doğrulamayı açmadan önce e-posta adresini doğrulamalısın.");
        }
        mfaEmailService.issueCode(account);
    }

    @Transactional
    public void enableEmailMfa(String code) {
        Account account = accountService.getAccount(currentUsername());
        if (!mfaEmailService.verify(account.getId(), code)) {
            throw new BadCredentialsException("Kod geçersiz veya süresi dolmuş.");
        }
        account.setMfaEmailEnabled(true);
        accountService.saveRaw(account);
        auditLogService.record("MFA_EMAIL_ENABLED", "ACCOUNT", account.getId(), null);
    }

    @Transactional
    public void disableEmailMfa(String password) {
        Account account = accountService.getAccount(currentUsername());
        if (!passwordEncoder.matches(password, account.getPassword())) {
            throw new BadCredentialsException("Şifre hatalı.");
        }
        account.setMfaEmailEnabled(false);
        accountService.saveRaw(account);
        auditLogService.record("MFA_EMAIL_DISABLED", "ACCOUNT", account.getId(), null);
    }

    @Transactional
    public TotpSetupResponse startTotpSetup() {
        Account account = accountService.getAccount(currentUsername());
        String secret = totpService.generateSecret();
        account.setMfaTotpSecret(secretCipher.encrypt(secret));
        account.setMfaTotpEnabled(false);
        account.setMfaTotpLastStep(null);
        accountService.saveRaw(account);
        return new TotpSetupResponse(secret, totpService.qrDataUri(account.getEmail(), secret));
    }

    @Transactional
    public List<String> enableTotp(String code) {
        Account account = accountService.getAccount(currentUsername());
        if (account.getMfaTotpSecret() == null) {
            throw new IllegalArgumentException("Önce authenticator kurulumunu başlat.");
        }
        String secret = secretCipher.decrypt(account.getMfaTotpSecret());
        long lastStep = account.getMfaTotpLastStep() == null ? -1 : account.getMfaTotpLastStep();
        long step = totpService.verifyAndGetStep(secret, code, lastStep);
        if (step < 0) {
            throw new BadCredentialsException("Kod geçersiz. Authenticator uygulamandaki güncel kodu gir.");
        }
        account.setMfaTotpEnabled(true);
        account.setMfaTotpLastStep(step);
        accountService.saveRaw(account);
        List<String> recoveryCodes = mfaRecoveryService.regenerate(account);
        auditLogService.record("MFA_TOTP_ENABLED", "ACCOUNT", account.getId(), null);
        return recoveryCodes;
    }

    @Transactional
    public void disableTotp(String password) {
        Account account = accountService.getAccount(currentUsername());
        if (!passwordEncoder.matches(password, account.getPassword())) {
            throw new BadCredentialsException("Şifre hatalı.");
        }
        account.setMfaTotpEnabled(false);
        account.setMfaTotpSecret(null);
        account.setMfaTotpLastStep(null);
        accountService.saveRaw(account);
        mfaRecoveryService.clear(account.getId());
        auditLogService.record("MFA_TOTP_DISABLED", "ACCOUNT", account.getId(), null);
    }

}
