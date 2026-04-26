package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.account.MyAccountResponse;
import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.account.UpdateProfileRequest;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AccountManager {

    private final AccountService accountService;

    private String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    public MyAccountResponse getCurrentUser() {
        return accountService.getByUsername(currentUsername());
    }

    public PublicAccountResponse getPublicProfile(String username) {
        return accountService.getPublicProfile(username);
    }

    public PageResponse<PublicAccountResponse> searchAccounts(String query, int page, int size) {
        return accountService.searchAccounts(query, page, size);
    }

    public MyAccountResponse updateProfile(UpdateProfileRequest request) {
        return accountService.updateProfile(currentUsername(), request);
    }

    public void deleteAccount() {
        accountService.deleteAccount(currentUsername());
    }

    public String updateAvatar(MultipartFile file) {
        return accountService.updateAvatar(currentUsername(), file);
    }

    public String updateCover(MultipartFile file) {
        return accountService.updateCover(currentUsername(), file);
    }
}