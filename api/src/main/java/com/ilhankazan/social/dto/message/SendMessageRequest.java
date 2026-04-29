package com.ilhankazan.social.dto.message;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload to send a direct message via STOMP")
public record SendMessageRequest(
    @Schema(description = "The ID of the conversation", example = "105")
    @NotNull(message = "Conversation ID is required")
    Long conversationId,

    @Schema(description = "Message content", example = "Hey! Did you check out the new backend polish commit?")
    @NotBlank(message = "Content cannot be blank")
    @Size(max = 4000, message = "Content cannot exceed 4000 characters")
    String content
) {}
