package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.DeviceToken;
import com.ilhankazan.social.repository.DeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeviceTokenService {

    private final DeviceTokenRepository deviceTokenRepository;

    @Transactional
    public void register(Account account, String token, String platform) {
        DeviceToken deviceToken = deviceTokenRepository.findByToken(token).orElseGet(DeviceToken::new);
        deviceToken.setAccount(account);
        deviceToken.setToken(token);
        deviceToken.setPlatform(platform);
        deviceTokenRepository.save(deviceToken);
    }

    @Transactional
    public void unregister(Long accountId, String token) {
        deviceTokenRepository.findByToken(token)
            .filter(deviceToken -> deviceToken.getAccount().getId().equals(accountId))
            .ifPresent(DeviceToken::softDelete);
    }

    @Transactional(readOnly = true)
    public List<DeviceToken> findActiveByAccountId(Long accountId) {
        return deviceTokenRepository.findByAccountId(accountId);
    }
}
