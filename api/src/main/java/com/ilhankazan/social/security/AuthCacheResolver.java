package com.ilhankazan.social.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("auth")
public class AuthCacheResolver {

    public String user() {
        String username = usernameOrNull();
        return username != null ? username : "anonymous";
    }

    /** Username of the authenticated principal, or {@code null} when the request is anonymous. */
    public String usernameOrNull() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !authentication.getPrincipal().equals("anonymousUser")) {
            return authentication.getName();
        }
        return null;
    }
}
