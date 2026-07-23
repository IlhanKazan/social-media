package com.ilhankazan.social.security;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.util.CidrMatcher;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class ClientIpResolver {

    private final AppProperties.ProxyTrustProperties proxyTrustProperties;

    public String resolve(HttpServletRequest request) {
        String rawPeer = request.getRemoteAddr();

        if (!CidrMatcher.matchesAny(rawPeer, proxyTrustProperties.trustedProxyCidrs())) {
            // Request didn't arrive via our own reverse proxy (Traefik) — any
            // forwarded-IP header could be forged by whoever is talking to us directly.
            return rawPeer;
        }

        String cfConnectingIp = request.getHeader("CF-Connecting-IP");
        if (StringUtils.hasText(cfConnectingIp)) {
            return cfConnectingIp.trim();
        }

        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return forwardedFor.split(",")[0].trim();
        }

        return rawPeer;
    }
}
