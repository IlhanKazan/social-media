package com.ilhankazan.social.dto.post;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload to create a new post or reply")
public record CreatePostRequest(
    @Schema(description = "Content of the post", example = "Just finished implementing the STOMP WebSocket layer.")
    @NotBlank(message = "Content cannot be blank")
    @Size(max = 500, message = "Content cannot exceed 500 characters")
    String content,

    @Schema(description = "Optional image URL for the post", example = "...")
    @Size(max = 500, message = "Image URL cannot exceed 500 characters")
    String imageUrl,

    @Schema(description = "If this is a reply, the ID of the parent post", example = "42")
    Long parentPostId
) {}
