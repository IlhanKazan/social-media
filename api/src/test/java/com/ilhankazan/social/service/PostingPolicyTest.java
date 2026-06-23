package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.exception.PostingRestrictedException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PostingPolicyTest {

    private final SystemSettingsService settings = mock(SystemSettingsService.class);
    private final PostingPolicy policy = new PostingPolicy(settings);

    private Account account(boolean emailVerified) {
        Account account = new Account();
        account.setEmailVerified(emailVerified);
        return account;
    }

    @Test
    void blocksUnverifiedAccountWhenVerifiedOnlyModeIsOn() {
        when(settings.getBooleanSetting(SystemSettingsService.VERIFIED_ONLY_POSTING, false)).thenReturn(true);
        assertThatThrownBy(() -> policy.requireCanPost(account(false)))
            .isInstanceOf(PostingRestrictedException.class);
    }

    @Test
    void allowsVerifiedAccountWhenVerifiedOnlyModeIsOn() {
        when(settings.getBooleanSetting(SystemSettingsService.VERIFIED_ONLY_POSTING, false)).thenReturn(true);
        assertThatCode(() -> policy.requireCanPost(account(true))).doesNotThrowAnyException();
    }

    @Test
    void allowsEveryoneWhenVerifiedOnlyModeIsOff() {
        when(settings.getBooleanSetting(SystemSettingsService.VERIFIED_ONLY_POSTING, false)).thenReturn(false);
        assertThatCode(() -> policy.requireCanPost(account(false))).doesNotThrowAnyException();
    }
}
