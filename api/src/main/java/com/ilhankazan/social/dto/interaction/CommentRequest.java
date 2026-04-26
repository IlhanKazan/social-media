package com.ilhankazan.social.dto.interaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequest(
    @NotBlank(message = "Comment cannot be blank")
    @Size(max = 4000, message = "Comment cannot exceed 4000 characters")
    String content
) {}