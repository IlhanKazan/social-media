package com.ilhankazan.social.service.moderation;

import com.ilhankazan.social.config.ModerationProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Primary
@Service
@RequiredArgsConstructor
public class CompositeModerator implements ContentModerator {

    private final ModerationProperties properties;
    private final RegexPreFilter regexPreFilter;
    private final OpenAiModerator openAiModerator;

    @Override
    public ModerationResult moderate(String text, List<String> imageUrls) {
        if (!properties.enabled()) {
            log.debug("Moderation logic disabled via configuration. Auto-passing.");
            return new ModerationResult(false, Map.of(), "DISABLED");
        }

        ModerationResult regexResult = regexPreFilter.moderate(text, imageUrls);
        if (regexResult.flagged()) {
            log.info("Content immediately flagged by RegexPreFilter.");
            return regexResult;
        }

        return openAiModerator.moderate(text, imageUrls);
    }
}
