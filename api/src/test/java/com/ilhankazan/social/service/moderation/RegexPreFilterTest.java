package com.ilhankazan.social.service.moderation;

import com.ilhankazan.social.config.ModerationProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RegexPreFilterTest {

    private static final List<String> NO_IMAGES = List.of();

    private RegexPreFilter filter;

    @BeforeEach
    void setUp() {
        ModerationProperties props = new ModerationProperties(
            true, null, 0.5, Map.of(), "moderation/test-blocked-terms.txt");
        filter = new RegexPreFilter(props);
        filter.loadBlockedTerms();
    }

    @Test
    void flagsBlockedTermAsWholeWord() {
        ModerationResult result = filter.moderate("this message is spam honestly", NO_IMAGES);

        assertThat(result.flagged()).isTrue();
        assertThat(result.provider()).isEqualTo("REGEX");
        assertThat(result.categoryScores()).containsEntry("regex_match", 1.0);
    }

    @Test
    void matchingIsCaseInsensitive() {
        assertThat(filter.moderate("SPAM everywhere", NO_IMAGES).flagged()).isTrue();
    }

    @Test
    void doesNotFlagBlockedTermEmbeddedInLargerWord() {
        assertThat(filter.moderate("the spammer left", NO_IMAGES).flagged()).isFalse();
    }

    @Test
    void passesCleanContentWithEmptyScores() {
        ModerationResult result = filter.moderate("perfectly ordinary content", NO_IMAGES);

        assertThat(result.flagged()).isFalse();
        assertThat(result.categoryScores()).isEmpty();
        assertThat(result.provider()).isEqualTo("REGEX");
    }

    @Test
    void passesNullAndBlankText() {
        assertThat(filter.moderate(null, NO_IMAGES).flagged()).isFalse();
        assertThat(filter.moderate("   ", NO_IMAGES).flagged()).isFalse();
    }
}
