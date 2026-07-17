package com.ilhankazan.social.manager;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.DeviceTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DeviceManager {

    private final DeviceTokenService deviceTokenService;
    private final AccountService accountService;

    private Account getCurrentAccount() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username);
    }

    @Transactional
    public void registerDevice(String token, String platform) {
        deviceTokenService.register(getCurrentAccount(), token, platform);
    }

    @Transactional
    public void unregisterDevice(String token) {
        deviceTokenService.unregister(getCurrentAccount().getId(), token);
    }
}
