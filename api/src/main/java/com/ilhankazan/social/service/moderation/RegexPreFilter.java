package com.ilhankazan.social.service.moderation;

import com.ilhankazan.social.config.ModerationProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

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
        String resourcePath = properties.blockedTermsPath();
        if (resourcePath == null || resourcePath.isBlank()) {
            log.warn("Blocked terms path is not configured. Regex moderation skipped.");
            return;
        }

        ClassPathResource resource = new ClassPathResource(resourcePath);
        if (!resource.exists()) {
            log.error("Blocked terms resource not found on classpath: {}", resourcePath);
            return;
        }

        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            List<String> terms = reader.lines()
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
