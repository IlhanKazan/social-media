package com.ilhankazan.social.dto.post;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateQuoteRepostRequest(
    @Size(max = 500, message = "Content cannot exceed 500 characters")
    String content,

    @Size(max = 500, message = "Image URL cannot exceed 500 characters")
    String imageUrl,

    @NotNull(message = "Quoted post ID is required")
    Long quotedPostId
) {}
