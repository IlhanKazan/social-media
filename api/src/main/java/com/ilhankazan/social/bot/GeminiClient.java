package com.ilhankazan.social.bot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.config.BotProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Optional;

@Slf4j
@Component
public class GeminiClient {

    private final RestClient restClient;
    private final BotProperties botProperties;
    private final ObjectMapper objectMapper;

    public GeminiClient(RestClient.Builder builder, BotProperties botProperties, ObjectMapper objectMapper) {
        this.restClient = builder.build();
        this.botProperties = botProperties;
        this.objectMapper = objectMapper;
    }

    public Optional<String> generatePost(String topic) {
        if (botProperties.geminiApiKey() == null || botProperties.geminiApiKey().isBlank()) {
            log.warn("GeminiClient: gemini-api-key is not configured, skipping post generation");
            return Optional.empty();
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
            + botProperties.geminiModel()
            + ":generateContent?key="
            + botProperties.geminiApiKey();

        String requestBody = """
            {"contents":[{"parts":[{"text":"Write a short social media post (max 200 characters) about: %s. Be engaging and conversational."}]}]}
            """.formatted(topic);

        try {
            String response = restClient.post()
                .uri(url)
                .header("Content-Type", "application/json")
                .body(requestBody)
                .retrieve()
                .body(String.class);

            return parseContent(response);
        } catch (RestClientException e) {
            log.warn("GeminiClient: failed to generate post for topic '{}': {}", topic, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<String> parseContent(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                log.warn("GeminiClient: no candidates in response");
                return Optional.empty();
            }
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                log.warn("GeminiClient: no parts in response");
                return Optional.empty();
            }
            String text = parts.get(0).path("text").asText();
            return StringUtils.hasText(text) ? Optional.of(text.trim()) : Optional.empty();
        } catch (Exception e) {
            log.warn("GeminiClient: failed to parse response", e);
            return Optional.empty();
        }
    }
}
