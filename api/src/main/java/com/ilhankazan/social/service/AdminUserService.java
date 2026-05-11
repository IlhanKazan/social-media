package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Role;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.RoleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    public Page<Account> getUsers(int page, int size, String search, String status, Boolean verified, String role) {
        String searchParam = (search != null && !search.trim().isEmpty())
            ? "%" + search.toLowerCase() + "%"
            : null;
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String roleName = role != null && !role.isEmpty() ? "ROLE_" + role.toUpperCase() : null;
        return accountRepository.findAdminUsers(searchParam, status, verified, roleName, pageRequest);
    }

    @Transactional(readOnly = true)
    public Account getUserById(Long accountId) {
        return accountRepository.findById(accountId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + accountId));
    }

    @Transactional
    public Account banUser(Long accountId, String reason) {
        Account account = getUserById(accountId);
        account.setBannedAt(Instant.now());
        account.setBannedReason(reason);
        return accountRepository.save(account);
    }

    @Transactional
    public Account unbanUser(Long accountId) {
        Account account = getUserById(accountId);
        account.setBannedAt(null);
        account.setBannedReason(null);
        return accountRepository.save(account);
    }

    @Transactional
    public Account updateRole(Long accountId, String roleName) {
        Account account = getUserById(accountId);
        Role newRole = roleRepository.findByName(roleName)
            .orElseThrow(() -> new EntityNotFoundException("Role not found: " + roleName));
        account.setRole(newRole);
        return accountRepository.save(account);
    }
}
