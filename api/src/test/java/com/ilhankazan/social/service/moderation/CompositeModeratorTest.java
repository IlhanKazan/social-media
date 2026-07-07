package com.ilhankazan.social.service.moderation;

import com.ilhankazan.social.config.ModerationProperties;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CompositeModeratorTest {

    private static final String TEXT = "hello world";
    private static final List<String> IMAGES = List.of();

    private final RegexPreFilter regexPreFilter = mock(RegexPreFilter.class);
    private final OpenAiModerator openAiModerator = mock(OpenAiModerator.class);

    private CompositeModerator moderator(boolean enabled) {
        ModerationProperties props =
            new ModerationProperties(enabled, null, 0.5, Map.of(), null);
        return new CompositeModerator(props, regexPreFilter, openAiModerator);
    }

    @Test
    void disabledModerationAutoPassesWithoutCallingProviders() {
        ModerationResult result = moderator(false).moderate(TEXT, IMAGES);

        assertThat(result.flagged()).isFalse();
        assertThat(result.provider()).isEqualTo("DISABLED");

        verifyNoInteractions(regexPreFilter, openAiModerator);
    }

    @Test
    void regexFlagShortCircuitsBeforeOpenAi() {
        ModerationResult flagged =
            new ModerationResult(true, Map.of("regex_match", 1.0), "REGEX");
        when(regexPreFilter.moderate(TEXT, IMAGES)).thenReturn(flagged);

        ModerationResult result = moderator(true).moderate(TEXT, IMAGES);

        assertThat(result).isSameAs(flagged);
        verify(regexPreFilter).moderate(TEXT, IMAGES);
        verifyNoInteractions(openAiModerator);
    }

    @Test
    void cleanRegexDelegatesToOpenAi() {
        ModerationResult clean = new ModerationResult(false, Map.of(), "REGEX");
        ModerationResult openAiVerdict =
            new ModerationResult(true, Map.of("harassment", 0.9), "OPENAI");
        when(regexPreFilter.moderate(TEXT, IMAGES)).thenReturn(clean);
        when(openAiModerator.moderate(TEXT, IMAGES)).thenReturn(openAiVerdict);

        ModerationResult result = moderator(true).moderate(TEXT, IMAGES);

        assertThat(result).isSameAs(openAiVerdict);
        verify(regexPreFilter).moderate(TEXT, IMAGES);
        verify(openAiModerator).moderate(TEXT, IMAGES);
    }
}
