package com.ilhankazan.social.service;

import com.ilhankazan.social.dto.account.MyAccountResponse;
import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.account.UpdateProfileRequest;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.repository.AccountRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final AccountMapper accountMapper;

    @Transactional(readOnly = true)
    public MyAccountResponse getByUsername(String username) {
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + username));
        return accountMapper.toMyResponse(account);
    }

    @Transactional(readOnly = true)
    public PublicAccountResponse getPublicProfile(String username) {
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + username));
        return accountMapper.toPublicResponse(account);
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicAccountResponse> searchAccounts(String query, int page, int size) {
        Page<Account> accounts = accountRepository
                .findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
                        query, query, PageRequest.of(page, size));
        return PageResponse.of(accounts.map(accountMapper::toPublicResponse));
    }

    @Transactional
    public MyAccountResponse updateProfile(String username, UpdateProfileRequest request) {
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        if (request.displayName() != null) {
            account.setDisplayName(request.displayName());
        }
        if (request.bio() != null) {
            account.setBio(request.bio());
        }
        return accountMapper.toMyResponse(accountRepository.save(account));
    }

    @Transactional
    public void deleteAccount(String username) {
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        accountRepository.delete(account);
    }

    public String updateAvatar(String username, MultipartFile file) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public String updateCover(String username, MultipartFile file) {
        throw new UnsupportedOperationException("Not implemented yet");
    }
}