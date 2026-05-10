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
import java.util.Optional;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final CloudinaryStorageService storageService;

    @Cacheable(value = "accountsByUsername", key = "#username")
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

    @CacheEvict(value = "accountsByUsername", key = "#username")
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

    @CacheEvict(value = "accountsByUsername", key = "#username")
    @Transactional
    public Account updateAvatar(String username, MultipartFile file) {
        Account account = getAccount(username);
        String imageUrl = storageService.uploadFile(file, "avatars");
        account.setProfileImageUrl(imageUrl);
        return accountRepository.save(account);
    }

    @CacheEvict(value = "accountsByUsername", key = "#username")
    @Transactional
    public Account updateCover(String username, MultipartFile file) {
        Account account = getAccount(username);
        String imageUrl = storageService.uploadFile(file, "covers");
        account.setCoverImageUrl(imageUrl);
        return accountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public Optional<Account> findByEmail(String email) {
        return accountRepository.findByEmail(email);
    }

    @Transactional
    public Account saveRaw(Account account) {
        return accountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public List<Account> getAccountsByIds(List<Long> accountIds) {
        if (accountIds == null || accountIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return accountRepository.findAllById(accountIds);
    }

    @Transactional(readOnly = true)
    public boolean isAccountBanned(Long accountId) {
        return accountRepository.existsByIdAndBannedAtIsNotNull(accountId);
    }

    @Transactional(readOnly = true)
    public long countTotalAccounts() {
        return accountRepository.count();
    }

    @Transactional(readOnly = true)
    public long countBannedAccounts() {
        return accountRepository.countByBannedAtIsNotNull();
    }
}
