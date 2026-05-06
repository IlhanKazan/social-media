package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.entity.Repost;
import com.ilhankazan.social.repository.RepostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RepostService {

    private final RepostRepository repostRepository;

    @Transactional
    public boolean toggleRepost(Account account, Post post) {
        Optional<Repost> existing = repostRepository.findByAccountIdAndPostId(account.getId(), post.getId());
        if (existing.isPresent()) {
            Repost repost = existing.get();
            if (repost.isActive()) {
                repost.softDelete();
            } else {
                repost.setDeletedAt(null);
            }
            repostRepository.save(repost);
            return repost.isActive();
        } else {
            Repost r = new Repost();
            r.setAccount(account);
            r.setPost(post);
            repostRepository.save(r);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public Map<Long, Long> getRepostCounts(List<Long> postIds) {
        if (postIds.isEmpty()) return Collections.emptyMap();
        return repostRepository.countRepostsForPosts(postIds).stream()
            .collect(Collectors.toMap(
                RepostRepository.RepostCountRow::getPostId,
                RepostRepository.RepostCountRow::getCount
            ));
    }

    @Transactional(readOnly = true)
    public Set<Long> getRepostedByMe(Long accountId, List<Long> postIds) {
        if (postIds.isEmpty()) return Collections.emptySet();
        return Set.copyOf(repostRepository.findRepostedPostIdsByUser(accountId, postIds));
    }
}
