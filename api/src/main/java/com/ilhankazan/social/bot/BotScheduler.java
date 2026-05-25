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
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
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
    private final OpenAiBotClient openAiBotClient;
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

    private static final String[] LANGUAGES = {"English", "Türkçe"};

    @Scheduled(fixedDelayString = "#{${app.bot.cadence-seconds:180} * 1000}")
    public void tick() {
        if (!systemSettingsService.getBooleanSetting(SystemSettingsService.BOT_ENABLED, false)) {
            return;
        }

        resetQuotaIfNewDay();

        List<Account> bots = accountRepository.findByRoleName("ROLE_BOT");
        if (bots.isEmpty()) {
            return;
        }

        Account bot = bots.get(random.nextInt(bots.size()));
        String language = LANGUAGES[random.nextInt(LANGUAGES.length)];
        BotPersonas.Persona persona = BotPersonas.forDisplayName(bot.getDisplayName());

        // 0-1 (20%): new post, 2-5 (40%): reply, 6-9 (40%): like
        int action = random.nextInt(10);

        if (action < 2) {
            if (postsToday.get() < botProperties.dailyQuota()) {
                maybePost(bot, language, persona);
            }
        } else if (action < 6) {
            maybeReplyToPost(bot, language, persona);
        } else {
            maybeLikeRandomPost(bot);
        }
    }

    private void maybePost(Account bot, String language, BotPersonas.Persona persona) {
        String topic = BOT_TOPICS[random.nextInt(BOT_TOPICS.length)];
        log.info("BotScheduler: generating post — bot='{}', topic='{}', lang='{}'", bot.getUsername(), topic, language);

        openAiBotClient.generatePost(topic, language, persona).ifPresentOrElse(
            content -> {
                try {
                    postService.create(bot.getId(), content, null, null);
                    postsToday.incrementAndGet();
                    log.info("BotScheduler: post created by '{}' ({}/{})", bot.getUsername(), postsToday.get(), botProperties.dailyQuota());
                    auditLogService.record("BOT_POSTED", "POST", null, Map.of("botId", bot.getId(), "topic", topic));
                } catch (Exception e) {
                    log.warn("BotScheduler: failed to create post for bot '{}': {}", bot.getUsername(), e.getMessage());
                }
            },
            () -> log.warn("BotScheduler: OpenAI returned empty for topic '{}', skipping", topic)
        );
    }

    private void maybeReplyToPost(Account bot, String language, BotPersonas.Persona persona) {
        List<Post> candidates = postRepository.findTopLevelPostsByHumans(PageRequest.of(0, 30))
            .getContent().stream()
            .filter(p -> StringUtils.hasText(p.getContent()))
            .toList();

        if (candidates.isEmpty()) {
            return;
        }

        Post target = candidates.get(random.nextInt(candidates.size()));
        log.info("BotScheduler: generating reply — bot='{}', targetPost={}, lang='{}'", bot.getUsername(), target.getId(), language);

        openAiBotClient.generateReply(target.getContent(), language, persona).ifPresentOrElse(
            reply -> {
                try {
                    postService.create(bot.getId(), reply, null, target.getId());
                    log.info("BotScheduler: reply created by '{}' on post {}", bot.getUsername(), target.getId());
                } catch (Exception e) {
                    log.warn("BotScheduler: failed to create reply for bot '{}': {}", bot.getUsername(), e.getMessage());
                }
            },
            () -> log.warn("BotScheduler: OpenAI returned empty for reply, skipping")
        );
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
