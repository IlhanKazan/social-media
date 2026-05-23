package com.ilhankazan.social.bot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.config.BotProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class OpenAiBotClient {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    private final RestClient restClient;
    private final BotProperties botProperties;
    private final ObjectMapper objectMapper;

    public OpenAiBotClient(RestClient.Builder builder, BotProperties botProperties, ObjectMapper objectMapper) {
        this.restClient = builder.build();
        this.botProperties = botProperties;
        this.objectMapper = objectMapper;
    }

    public Optional<String> generatePost(String topic) {
        if (!StringUtils.hasText(botProperties.openaiApiKey())) {
            log.warn("OpenAiBotClient: openai-api-key is not configured, skipping post generation");
            return Optional.empty();
        }

        Map<String, Object> requestBody = Map.of(
            "model", botProperties.openaiModel(),
            "messages", List.of(
                Map.of("role", "user", "content",
                    "Write a short social media post (max 200 characters) about: " + topic + ". Be engaging and conversational.")
            ),
            "max_tokens", 200
        );

        try {
            String response = restClient.post()
                .uri(OPENAI_URL)
                .header("Authorization", "Bearer " + botProperties.openaiApiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

            return parseContent(response);
        } catch (RestClientException e) {
            log.warn("OpenAiBotClient: failed to generate post for topic '{}': {}", topic, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<String> parseContent(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                log.warn("OpenAiBotClient: no choices in response");
                return Optional.empty();
            }
            String text = choices.get(0).path("message").path("content").asText();
            return StringUtils.hasText(text) ? Optional.of(text.trim()) : Optional.empty();
        } catch (Exception e) {
            log.warn("OpenAiBotClient: failed to parse response", e);
            return Optional.empty();
        }
    }
}
