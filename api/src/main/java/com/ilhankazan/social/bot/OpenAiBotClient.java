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

    public Optional<String> generatePost(String topic, String language, BotPersonas.Persona persona) {
        String prompt = "Write a short social media post (max 200 characters) about: " + topic + ". " +
            "Write in " + language + ". Be engaging and conversational. Don't always use emojis.";
        return callApi(prompt, persona);
    }

    public Optional<String> generateReply(String postContent, String language, BotPersonas.Persona persona) {
        String prompt = "Here's a social media post: \"" + postContent + "\". " +
            "Write a short reply (max 150 characters) in " + language + ". " +
            "Be natural — sometimes agree, sometimes add a different perspective, occasionally disagree politely. " +
            "Don't start every reply with 'I'. Don't use emojis every sentence.";
        return callApi(prompt, persona);
    }

    private Optional<String> callApi(String prompt, BotPersonas.Persona persona) {
        if (!StringUtils.hasText(botProperties.openaiApiKey())) {
            log.warn("OpenAiBotClient: openai-api-key is not configured, skipping");
            return Optional.empty();
        }

        List<Map<String, String>> messages = persona != null
            ? List.of(
                Map.of("role", "system", "content",
                    "You are " + persona.displayName() + ". Personality: " + persona.style() + ". " +
                    "Write authentically as this person. Keep it short and natural."),
                Map.of("role", "user", "content", prompt))
            : List.of(Map.of("role", "user", "content", prompt));

        Map<String, Object> requestBody = Map.of(
            "model", botProperties.openaiModel(),
            "messages", messages,
            "max_completion_tokens", 200
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
            log.warn("OpenAiBotClient: API call failed: {}", e.getMessage());
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
