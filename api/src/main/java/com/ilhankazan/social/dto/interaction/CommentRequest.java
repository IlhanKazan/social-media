package com.ilhankazan.social.dto.interaction;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload to add a comment to a post")
public record CommentRequest(
    @Schema(description = "Comment text", example = "Great architecture! Have you considered using Kafka instead of in-memory broker?")
    @NotBlank(message = "Comment cannot be blank")
    @Size(max = 4000, message = "Comment cannot exceed 4000 characters")
    String content
) {}
