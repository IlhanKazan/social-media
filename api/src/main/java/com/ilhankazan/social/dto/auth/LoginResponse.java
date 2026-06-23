package com.ilhankazan.social.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
    String status,
    String accessToken,
    Long accessTokenExpiresIn,
    Long refreshTokenExpiresIn,
    AuthResponse.AccountSummary account,
    String mfaToken,
    List<String> methods
) {
    public static LoginResponse authenticated(AuthResponse a) {
        return new LoginResponse("AUTHENTICATED", a.accessToken(),
            a.accessTokenExpiresIn(), a.refreshTokenExpiresIn(), a.account(), null, null);
    }

    public static LoginResponse mfaRequired(String mfaToken, List<String> methods) {
        return new LoginResponse("MFA_REQUIRED", null, null, null, null, mfaToken, methods);
    }
}
