package com.ilhankazan.social.dto.auth;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    long accessTokenExpiresIn,
    long refreshTokenExpiresIn,
    AccountSummary account
) {
    public record AccountSummary(
        Long id,
        String username,
        String email,
        String displayName,
        String profileImageUrl,
        String role
    ) {}
}
