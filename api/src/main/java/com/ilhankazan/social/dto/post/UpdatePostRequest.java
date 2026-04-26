package com.ilhankazan.social.dto.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePostRequest(
    @NotBlank(message = "Content cannot be blank")
    @Size(max = 500, message = "Content cannot exceed 500 characters")
    String content,

    @Size(max = 500, message = "Image URL cannot exceed 500 characters")
    String imageUrl
) {}
