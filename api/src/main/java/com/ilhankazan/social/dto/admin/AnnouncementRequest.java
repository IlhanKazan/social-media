package com.ilhankazan.social.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A broadcast to every account that still accepts optional email.
 *
 * @param title    subject line and heading
 * @param message  body; plain text, rendered into the standard template
 * @param confirm  must repeat the recipient count returned by the preview, so a
 *                 send cannot be fired from a stale screen after the audience
 *                 has changed underneath it
 */
public record AnnouncementRequest(
    @NotBlank @Size(max = 120) String title,
    @NotBlank @Size(max = 4000) String message,
    @NotBlank @Size(max = 512) String linkUrl,
    int confirm
) {}
