package com.ilhankazan.social.service.moderation;

import com.ilhankazan.social.config.ModerationProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Slf4j
@Component
@RequiredArgsConstructor
public class RegexPreFilter implements ContentModerator {

    private final ModerationProperties properties;
    private Pattern compiledPattern;

    private static final String BOUNDARY = "(^|[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ])";
    private static final String LOOKAHEAD = "(?=[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]|$)";

    @PostConstruct
    public void loadBlockedTerms() {
        String pathStr = properties.blockedTermsPath();
        if (pathStr == null || pathStr.isBlank()) {
            log.warn("Blocked terms path is not configured. Regex moderation skipped.");
            return;
        }

        Path path = Paths.get(pathStr);
        if (!Files.exists(path)) {
            log.error("Blocked terms file missing: {}", path.toAbsolutePath());
            return;
        }

        try (Stream<String> lines = Files.lines(path)) {
            List<String> terms = lines
                .filter(line -> !line.isBlank() && !line.startsWith("#"))
                .map(String::trim)
                .map(Pattern::quote)
                .toList();

            if (!terms.isEmpty()) {
                String regexBody = String.join("|", terms);
                String finalRegex = "(?iu)" + BOUNDARY + "(" + regexBody + ")" + LOOKAHEAD;

                this.compiledPattern = Pattern.compile(finalRegex);
                log.info("Moderation engine ready. {} terms compiled.", terms.size());
            }
        } catch (Exception e) {
            log.error("Critical failure loading blocked terms", e);
        }
    }

    @Override
    public ModerationResult moderate(String text, List<String> imageUrls) {
        if (text == null || text.isBlank() || compiledPattern == null) {
            return new ModerationResult(false, Map.of(), "REGEX");
        }

        boolean match = compiledPattern.matcher(text).find();

        return new ModerationResult(
            match,
            match ? Map.of("regex_match", 1.0) : Map.of(),
            "REGEX"
        );
    }
}
