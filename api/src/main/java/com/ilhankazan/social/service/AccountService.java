package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.repository.AccountRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final CloudinaryStorageService storageService;

    @Transactional(readOnly = true)
    public Account getAccount(String username) {
        return accountRepository.findByUsername(username)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + username));
    }

    @Transactional(readOnly = true)
    public Account getAccountById(Long id) {
        return accountRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Account not found: " + id));
    }

    @Transactional(readOnly = true)
    public Page<Account> searchAccountsRaw(String query, int page, int size) {
        return accountRepository
            .findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
                query, query, PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public List<Account> getSuggestions(Long currentUserId, int limit) {
        return accountRepository.findSuggestions(currentUserId, limit);
    }

    @Transactional
    public Account updateProfile(String username, String displayName, String bio) {
        Account account = getAccount(username);
        if (displayName != null) {
            account.setDisplayName(displayName);
        }
        if (bio != null) {
            account.setBio(bio);
        }
        return accountRepository.save(account);
    }

    @Transactional
    public void softDeleteAccount(Account account) {
        account.softDelete();
        accountRepository.save(account);
    }

    @Transactional
    public Account updateAvatar(String username, MultipartFile file) {
        Account account = getAccount(username);
        String imageUrl = storageService.uploadFile(file, "avatars");
        account.setProfileImageUrl(imageUrl);
        return accountRepository.save(account);
    }

    @Transactional
    public Account updateCover(String username, MultipartFile file) {
        Account account = getAccount(username);
        String imageUrl = storageService.uploadFile(file, "covers");
        account.setCoverImageUrl(imageUrl);
        return accountRepository.save(account);
    }
}
