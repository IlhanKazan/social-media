package com.ilhankazan.social.dto.auth;

import java.util.List;

/** Internal result of a login attempt: either authenticated, or an MFA challenge. */
public record LoginResult(AuthResponse auth, String mfaToken, List<String> methods) {

    public boolean mfaRequired() {
        return auth == null;
    }

    public static LoginResult authenticated(AuthResponse auth) {
        return new LoginResult(auth, null, null);
    }

    public static LoginResult mfa(String mfaToken, List<String> methods) {
        return new LoginResult(null, mfaToken, methods);
    }
}
