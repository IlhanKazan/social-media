package com.ilhankazan.social.dto.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
    @NotBlank(message = "Mevcut şifre zorunludur")
    String oldPassword,

    @NotBlank(message = "Yeni şifre zorunludur")
    @Size(min = 6, max = 100, message = "Yeni şifre en az 6 karakter olmalıdır")
    String newPassword
) {}
