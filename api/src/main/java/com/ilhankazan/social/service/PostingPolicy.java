package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.exception.PostingRestrictedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PostingPolicy {

    private final SystemSettingsService systemSettingsService;

    // Single gate for every content-creation path (post, reply, repost, quote-repost),
    // so a rule like verified-only posting cannot be bypassed by an unguarded write.
    public void requireCanPost(Account account) {
        boolean verifiedOnly = systemSettingsService.getBooleanSetting(
            SystemSettingsService.VERIFIED_ONLY_POSTING,
            false
        );

        if (verifiedOnly && !account.isEmailVerified()) {
            throw new PostingRestrictedException(
                "Sistem ayarları gereği şu anda sadece e-postası doğrulanmış hesaplar gönderi paylaşabilir.");
        }
    }
}
