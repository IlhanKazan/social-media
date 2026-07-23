package com.ilhankazan.social.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CidrMatcherTest {

    @Test
    void matchesIpv4WithinRange() {
        assertThat(CidrMatcher.matchesAny("10.5.6.7", List.of("10.0.0.0/8"))).isTrue();
        assertThat(CidrMatcher.matchesAny("172.20.0.1", List.of("172.16.0.0/12"))).isTrue();
        assertThat(CidrMatcher.matchesAny("192.168.1.1", List.of("192.168.0.0/16"))).isTrue();
    }

    @Test
    void rejectsIpv4OutsideRange() {
        assertThat(CidrMatcher.matchesAny("8.8.8.8", List.of("10.0.0.0/8"))).isFalse();
        assertThat(CidrMatcher.matchesAny("172.32.0.1", List.of("172.16.0.0/12"))).isFalse();
    }

    @Test
    void exactSingleHostMatch() {
        assertThat(CidrMatcher.matchesAny("127.0.0.1", List.of("127.0.0.1/32"))).isTrue();
        assertThat(CidrMatcher.matchesAny("127.0.0.2", List.of("127.0.0.1/32"))).isFalse();
    }

    @Test
    void matchesIpv6WithinRange() {
        assertThat(CidrMatcher.matchesAny("::1", List.of("::1/128"))).isTrue();
        assertThat(CidrMatcher.matchesAny("2001:db8::1", List.of("2001:db8::/32"))).isTrue();
        assertThat(CidrMatcher.matchesAny("2001:db9::1", List.of("2001:db8::/32"))).isFalse();
    }

    @Test
    void doesNotConfuseIpv4AndIpv6Families() {
        assertThat(CidrMatcher.matchesAny("10.0.0.1", List.of("::1/128"))).isFalse();
        assertThat(CidrMatcher.matchesAny("::1", List.of("10.0.0.0/8"))).isFalse();
    }

    @Test
    void matchesAgainstAnyCidrInList() {
        List<String> cidrs = List.of("10.0.0.0/8", "192.168.0.0/16", "127.0.0.1/32");
        assertThat(CidrMatcher.matchesAny("192.168.5.5", cidrs)).isTrue();
        assertThat(CidrMatcher.matchesAny("203.0.113.7", cidrs)).isFalse();
    }
}
