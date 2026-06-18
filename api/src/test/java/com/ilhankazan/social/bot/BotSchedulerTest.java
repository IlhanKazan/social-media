package com.ilhankazan.social.bot;

import com.ilhankazan.social.config.BotProperties;
import com.ilhankazan.social.repository.AccountRepository;
import com.ilhankazan.social.repository.PostRepository;
import com.ilhankazan.social.service.AuditLogService;
import com.ilhankazan.social.service.InteractionService;
import com.ilhankazan.social.service.PostService;
import com.ilhankazan.social.service.SystemSettingsService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class BotSchedulerTest {

    private BotScheduler scheduler(BotProperties props) {
        return new BotScheduler(
            mock(SystemSettingsService.class),
            mock(AccountRepository.class),
            mock(PostService.class),
            mock(InteractionService.class),
            mock(AuditLogService.class),
            mock(OpenAiBotClient.class),
            props,
            mock(PostRepository.class)
        );
    }

    private BotProperties props(int minInterval, int maxInterval, boolean activeHoursEnabled, int start, int end) {
        return new BotProperties(true, null, "model", 60, 10, 3,
            minInterval, maxInterval, activeHoursEnabled, start, end);
    }

    @Test
    void activeHoursDisabledAlwaysAllows() {
        BotScheduler s = scheduler(props(120, 360, false, 7, 23));
        assertThat(s.withinActiveHours(3)).isTrue();
        assertThat(s.withinActiveHours(15)).isTrue();
    }

    @Test
    void activeHoursDaytimeWindowExcludesNight() {
        BotScheduler s = scheduler(props(120, 360, true, 7, 23));
        assertThat(s.withinActiveHours(6)).isFalse();
        assertThat(s.withinActiveHours(7)).isTrue();
        assertThat(s.withinActiveHours(22)).isTrue();
        assertThat(s.withinActiveHours(23)).isFalse();
    }

    @Test
    void activeHoursWindowWrappingMidnight() {
        BotScheduler s = scheduler(props(120, 360, true, 22, 6));
        assertThat(s.withinActiveHours(23)).isTrue();
        assertThat(s.withinActiveHours(2)).isTrue();
        assertThat(s.withinActiveHours(6)).isFalse();
        assertThat(s.withinActiveHours(12)).isFalse();
    }

    @Test
    void scheduleNextBlocksBotUntilIntervalElapses() {
        BotScheduler s = scheduler(props(5, 5, false, 0, 0));
        Instant now = Instant.now();
        assertThat(s.isEligible(1L, now)).as("never scheduled bot is eligible").isTrue();

        s.scheduleNext(1L, now);
        assertThat(s.isEligible(1L, now.plus(4, ChronoUnit.MINUTES))).isFalse();
        assertThat(s.isEligible(1L, now.plus(5, ChronoUnit.MINUTES))).isTrue();
    }

    @Test
    void nextIntervalMinutesStaysWithinConfiguredBounds() {
        BotScheduler s = scheduler(props(120, 360, false, 0, 0));
        for (int i = 0; i < 1000; i++) {
            assertThat(s.nextIntervalMinutes()).isBetween(120L, 360L);
        }
    }
}
