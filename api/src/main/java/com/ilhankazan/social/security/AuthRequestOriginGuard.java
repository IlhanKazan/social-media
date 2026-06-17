package com.ilhankazan.social.security;

import com.ilhankazan.social.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;

@Component
@RequiredArgsConstructor
public class AuthRequestOriginGuard {

    private final AppProperties.CorsProperties corsProps;

    public void verify(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin == null) {
            origin = originFromReferer(request.getHeader("Referer"));
        }
        List<String> allowed = corsProps.allowedOrigins();
        if (origin == null || allowed == null || !allowed.contains(origin)) {
            throw new AccessDeniedException("Cross-origin request rejected");
        }
    }

    private String originFromReferer(String referer) {
        if (referer == null) return null;
        try {
            URI uri = URI.create(referer);
            if (uri.getScheme() == null || uri.getHost() == null) return null;
            int port = uri.getPort();
            return port == -1
                ? uri.getScheme() + "://" + uri.getHost()
                : uri.getScheme() + "://" + uri.getHost() + ":" + port;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
