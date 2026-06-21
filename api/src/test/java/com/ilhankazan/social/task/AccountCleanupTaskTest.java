package com.ilhankazan.social.task;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.MessageRepository;
import com.ilhankazan.social.repository.PostRepository;
import com.ilhankazan.social.service.CloudinaryStorageService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AccountCleanupTaskTest {

    @Test
    void purgesDmImageAssetsBeforeHardDelete() {
        AccountRepository accountRepository = mock(AccountRepository.class);
        PostRepository postRepository = mock(PostRepository.class);
        MessageRepository messageRepository = mock(MessageRepository.class);
        CloudinaryStorageService storageService = mock(CloudinaryStorageService.class);

        AccountCleanupTask task = new AccountCleanupTask(
            accountRepository, postRepository, messageRepository, storageService);

        Account account = mock(Account.class);
        when(account.getId()).thenReturn(42L);
        when(account.getUsername()).thenReturn("gone");
        when(accountRepository.findByDeletedAtBefore(any())).thenReturn(List.of(account));
        when(postRepository.findPostsWithImagesByAccountId(42L)).thenReturn(List.of());
        when(messageRepository.findDmImagePublicIdsForParticipant(42L)).thenReturn(List.of("social/dm/abc"));

        task.hardDeleteExpiredAccounts();

        verify(storageService).deleteByPublicId("social/dm/abc");
        verify(accountRepository).delete(account);
    }
}
