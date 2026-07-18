package com.ilhankazan.social.scheduler;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.manager.RecommendationManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecommendationScheduler {

    private final AppProperties.RecommendationProperties props;
    private final RecommendationManager recommendationManager;
    private final JdbcTemplate jdbcTemplate;

    private static final int ADVISORY_LOCK_ID = 7422;

    @Scheduled(fixedDelay = 3600000)
    @Transactional
    public void tick() {
        if (!props.enabled()) {
            return;
        }

        Boolean lockAcquired = jdbcTemplate.queryForObject("SELECT pg_try_advisory_xact_lock(?)", Boolean.class, ADVISORY_LOCK_ID);
        if (Boolean.FALSE.equals(lockAcquired)) {
            return;
        }

        int processed = recommendationManager.runBatch();
        if (processed > 0) {
            log.info("Recommendation batch evaluated {} recipients.", processed);
        }
    }
}
