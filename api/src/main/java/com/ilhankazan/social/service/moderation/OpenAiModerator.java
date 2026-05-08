package com.ilhankazan.social.service.moderation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.config.ModerationProperties;
import com.ilhankazan.social.exception.ModerationProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class OpenAiModerator implements ContentModerator {

    private static final String OPENAI_URL = "https://api.openai.com/v1/moderations";

    private final ModerationProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OpenAiModerator(ModerationProperties properties, RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    @Override
    public ModerationResult moderate(String text, List<String> imageUrls) {
        if (properties.openaiApiKey() == null || properties.openaiApiKey().isBlank()) {
            log.warn("OpenAI API key is missing. Skipping external moderation.");
            return new ModerationResult(false, Map.of(), "OPENAI");
        }

        try {
            String responseBody = restClient.post()
                .uri(OPENAI_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + properties.openaiApiKey())
                .body(Map.of("model", "omni-moderation-latest", "input", text != null ? text : ""))
                .retrieve()
                .body(String.class);

            return parseResponse(responseBody);
        } catch (Exception e) {
            log.error("Failed to call OpenAI Moderation API", e);
            throw new ModerationProviderException("OpenAI API call failed", e);
        }
    }

    private ModerationResult parseResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode resultNode = root.path("results").get(0);
            JsonNode categoryScoresNode = resultNode.path("category_scores");

            Map<String, Double> scores = new HashMap<>();
            boolean isFlagged = false;

            Iterator<Map.Entry<String, JsonNode>> fields = categoryScoresNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                String category = field.getKey();
                double score = field.getValue().asDouble();
                scores.put(category, score);

                if (score > properties.getThresholdForCategory(category)) {
                    isFlagged = true;
                }
            }

            return new ModerationResult(isFlagged, scores, "OPENAI");
        } catch (Exception e) {
            throw new ModerationProviderException("Failed to parse OpenAI response", e);
        }
    }
}
