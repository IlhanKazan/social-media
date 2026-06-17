package com.ilhankazan.social.dto.message;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload to share a post into a conversation")
public record SharePostRequest(
    @Schema(description = "The ID of the post to share", example = "42")
    @NotNull(message = "Post ID is required")
    Long postId,

    @Schema(description = "Optional caption to send with the shared post")
    @Size(max = 4000, message = "Caption cannot exceed 4000 characters")
    String caption
) {}
