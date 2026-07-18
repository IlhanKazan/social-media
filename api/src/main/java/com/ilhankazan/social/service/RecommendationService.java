package com.ilhankazan.social.service;

import com.ilhankazan.social.repository.DeviceTokenRepository;
import com.ilhankazan.social.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final PostRepository postRepository;
    private final DeviceTokenRepository deviceTokenRepository;

    // Collaborative first (a post liked by someone the user follows), then a global
    // trending fallback for users with no follow-graph signal.
    @Transactional(readOnly = true)
    public Optional<Long> findRecommendedPostId(Long userId, Instant since) {
        List<Long> collaborative = postRepository.findCollaborativeRecommendation(userId, since);
        if (!collaborative.isEmpty()) {
            return Optional.of(collaborative.get(0));
        }
        List<Long> trending = postRepository.findTrendingRecommendation(userId, since);
        return trending.isEmpty() ? Optional.empty() : Optional.of(trending.get(0));
    }

    @Transactional(readOnly = true)
    public List<Long> findEligibleRecipients(Instant cooldownCutoff, int limit) {
        return deviceTokenRepository.findRecommendationRecipients(cooldownCutoff, limit);
    }
}
