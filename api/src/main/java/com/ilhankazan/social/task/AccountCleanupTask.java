// src/main/java/com/ilhankazan/social/task/AccountCleanupTask.java
package com.ilhankazan.social.task;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.MessageRepository;
import com.ilhankazan.social.repository.PostRepository;
import com.ilhankazan.social.service.CloudinaryStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AccountCleanupTask {

    private final AccountRepository accountRepository;
    private final PostRepository postRepository;
    private final MessageRepository messageRepository;
    private final CloudinaryStorageService storageService;

    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void hardDeleteExpiredAccounts() {
        Instant cutoff = Instant.now().minus(30, ChronoUnit.DAYS);

        List<Account> accountsToDelete = accountRepository.findByDeletedAtBefore(cutoff);

        for (Account account : accountsToDelete) {
            log.info("Hard deleting account and all associated physical files: {}", account.getUsername());

            storageService.deleteFileByUrl(account.getProfileImageUrl());
            storageService.deleteFileByUrl(account.getCoverImageUrl());

            List<Post> userPostsWithImages = postRepository.findPostsWithImagesByAccountId(account.getId());
            for (Post post : userPostsWithImages) {
                storageService.deleteFileByUrl(post.getImageUrl());
            }

            // DM rows cascade away with the account, so their Cloudinary assets must be purged first.
            for (String publicId : messageRepository.findDmImagePublicIdsForParticipant(account.getId())) {
                storageService.deleteByPublicId(publicId);
            }

            accountRepository.delete(account);
        }
    }
}
