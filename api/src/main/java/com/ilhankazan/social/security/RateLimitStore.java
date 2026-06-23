package com.ilhankazan.social.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.function.Function;

@Component
public class RateLimitStore {

    // Bounded so a flood of distinct (or spoofed X-Forwarded-For) IPs can't grow the store without limit.
    private final Cache<String, Bucket> cache = Caffeine.newBuilder()
        .maximumSize(50_000)
        .expireAfterAccess(Duration.ofMinutes(15))
        .build();

    public Bucket bucket(String key, Function<String, Bucket> supplier) {
        return cache.get(key, supplier);
    }

    public void clear() {
        cache.invalidateAll();
    }
}
