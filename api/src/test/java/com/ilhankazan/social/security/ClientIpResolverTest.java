package com.ilhankazan.social.security;

import com.ilhankazan.social.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver(
        new AppProperties.ProxyTrustProperties(List.of("10.0.0.0/8", "127.0.0.1/32"))
    );

    @Test
    void trustsCfConnectingIpFromTrustedProxy() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("CF-Connecting-IP", "203.0.113.42");
        request.addHeader("X-Forwarded-For", "203.0.113.42, 172.71.0.1");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.42");
    }

    @Test
    void fallsBackToFirstForwardedForEntryWhenCfHeaderMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("X-Forwarded-For", "203.0.113.42, 172.71.0.1");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.42");
    }

    @Test
    void usesRawPeerWhenTrustedProxySendsNoForwardingHeaders() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");

        assertThat(resolver.resolve(request)).isEqualTo("10.0.0.5");
    }

    @Test
    void ignoresForgedHeadersWhenPeerIsNotATrustedProxy() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.99"); // attacker talking to us directly
        request.addHeader("CF-Connecting-IP", "1.2.3.4");
        request.addHeader("X-Forwarded-For", "1.2.3.4");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.99");
    }
}
