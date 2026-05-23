package com.ilhankazan.social.bot;

import com.ilhankazan.social.config.BotProperties;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.InteractionType;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.PostRepository;
import com.ilhankazan.social.service.AuditLogService;
import com.ilhankazan.social.service.InteractionService;
import com.ilhankazan.social.service.PostService;
import com.ilhankazan.social.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Component
@ConditionalOnProperty(prefix = "app.bot", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class BotScheduler {

    private final SystemSettingsService systemSettingsService;
    private final AccountRepository accountRepository;
    private final PostService postService;
    private final InteractionService interactionService;
    private final AuditLogService auditLogService;
    private final GeminiClient geminiClient;
    private final BotProperties botProperties;
    private final PostRepository postRepository;

    private final AtomicInteger postsToday = new AtomicInteger(0);
    private volatile Instant quotaWindowStart = startOfTodayUtc();
    private final Random random = new Random();

    private static final String[] BOT_TOPICS = {
        "technology and software development",
        "artificial intelligence trends",
        "spring boot and java",
        "open source software",
        "web development",
        "productivity tips",
        "coffee and coding",
        "modern software architecture",
        "developer life"
    };

    @Scheduled(fixedDelayString = "#{@botProperties.cadenceSeconds() * 1000}")
    public void tick() {
        if (!systemSettingsService.getBooleanSetting(SystemSettingsService.BOT_ENABLED, false)) {
            return;
        }

        resetQuotaIfNewDay();

        if (postsToday.get() >= botProperties.dailyQuota()) {
            log.debug("BotScheduler: daily quota reached ({}/{}), skipping", postsToday.get(), botProperties.dailyQuota());
            return;
        }

        List<Account> bots = accountRepository.findByRoleName("ROLE_BOT");
        if (bots.isEmpty()) {
            return;
        }

        Account bot = bots.get(random.nextInt(bots.size()));
        String topic = BOT_TOPICS[random.nextInt(BOT_TOPICS.length)];

        geminiClient.generatePost(topic).ifPresent(content -> {
            try {
                postService.create(bot.getId(), content, null, null);
                postsToday.incrementAndGet();
                auditLogService.record("BOT_POSTED", "POST", null, java.util.Map.of("botId", bot.getId(), "topic", topic));
            } catch (Exception e) {
                log.warn("BotScheduler: failed to create post for bot '{}': {}", bot.getUsername(), e.getMessage());
            }
        });

        if (random.nextInt(20) == 0) {
            try {
                maybeLikeRandomPost(bot);
            } catch (Exception e) {
                log.warn("BotScheduler: failed to like post for bot '{}': {}", bot.getUsername(), e.getMessage());
            }
        }
    }

    private void maybeLikeRandomPost(Account bot) {
        List<Post> posts = postRepository.findAllTopLevelPosts(PageRequest.of(0, 20)).getContent();
        if (posts.isEmpty()) {
            return;
        }
        Post post = posts.get(random.nextInt(posts.size()));
        if (post.getAccount().getId().equals(bot.getId())) {
            return;
        }
        try {
            interactionService.toggleReaction(bot, post, InteractionType.LIKE);
        } catch (Exception e) {
            log.warn("BotScheduler: failed to like post {} for bot '{}': {}", post.getId(), bot.getUsername(), e.getMessage());
        }
    }

    private void resetQuotaIfNewDay() {
        if (Instant.now().isAfter(quotaWindowStart.plus(1, ChronoUnit.DAYS))) {
            postsToday.set(0);
            quotaWindowStart = startOfTodayUtc();
        }
    }

    private static Instant startOfTodayUtc() {
        return LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
    }
}
