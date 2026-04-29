package com.ilhankazan.social.dto.post;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload to update an existing post")
public record UpdatePostRequest(
    @Schema(description = "Updated content", example = "Edited: Just finished implementing the STOMP WebSocket layer.")
    @NotBlank(message = "Content cannot be blank")
    @Size(max = 500, message = "Content cannot exceed 500 characters")
    String content,

    @Schema(description = "Updated image URL", example = "...")
    @Size(max = 500, message = "Image URL cannot exceed 500 characters")
    String imageUrl
) {}
