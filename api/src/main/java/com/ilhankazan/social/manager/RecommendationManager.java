package com.ilhankazan.social.manager;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.event.RecommendationCreatedEvent;
import com.ilhankazan.social.repository.PostRepository;
import com.ilhankazan.social.service.NotificationPreferenceService;
import com.ilhankazan.social.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationManager {

    private final RecommendationService recommendationService;
    private final NotificationPreferenceService preferenceService;
    private final PostRepository postRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AppProperties.RecommendationProperties props;

    @Transactional
    public void recommendForUser(Long userId) {
        if (!preferenceService.getOrDefault(userId).isRecommendations()) {
            return;
        }

        Instant since = Instant.now().minus(props.windowDays(), ChronoUnit.DAYS);
        Optional<Long> postIdOpt = recommendationService.findRecommendedPostId(userId, since);
        if (postIdOpt.isEmpty()) {
            return;
        }

        Long postId = postIdOpt.get();
        Long authorId = postRepository.findById(postId).map(p -> p.getAccount().getId()).orElse(null);
        if (authorId == null) {
            return;
        }

        eventPublisher.publishEvent(new RecommendationCreatedEvent(userId, postId, authorId));
    }

    @Transactional
    public int runBatch() {
        Instant cutoff = Instant.now().minus(props.cooldownHours(), ChronoUnit.HOURS);
        List<Long> recipients = recommendationService.findEligibleRecipients(cutoff, props.batchSize());

        for (Long userId : recipients) {
            try {
                recommendForUser(userId);
            } catch (Exception e) {
                log.warn("Recommendation failed for account {}: {}", userId, e.getMessage());
            }
        }
        return recipients.size();
    }
}
