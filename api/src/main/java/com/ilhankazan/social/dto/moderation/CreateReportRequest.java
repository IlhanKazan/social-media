package com.ilhankazan.social.dto.moderation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReportRequest(
    @NotBlank(message = "Reason cannot be blank")
    @Size(max = 64)
    String reason,

    @Size(max = 500)
    String details
) {}
