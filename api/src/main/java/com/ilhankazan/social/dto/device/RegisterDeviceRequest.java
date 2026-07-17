package com.ilhankazan.social.dto.device;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterDeviceRequest(
    @NotBlank(message = "Token cannot be blank")
    @Size(max = 255)
    String token,

    @NotBlank(message = "Platform cannot be blank")
    @Pattern(regexp = "ANDROID|IOS", message = "Platform must be ANDROID or IOS")
    String platform
) {}
