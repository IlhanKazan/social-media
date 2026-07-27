package com.ilhankazan.social.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.function.Function;

@Component
public class RateLimitStore {

    // The bucket IS the cache value, so evicting an entry hands the caller a fresh
    // full-capacity bucket. The TTL must therefore outlive the longest @RateLimit
    // window (currently 60 minutes) — at 15 minutes, every hourly limit was really
    // "capacity per 15 idle minutes", i.e. ~4x looser than declared. Memory is
    // bounded by maximumSize, not by this TTL.
    private final Cache<String, Bucket> cache = Caffeine.newBuilder()
        .maximumSize(50_000)
        .expireAfterAccess(Duration.ofMinutes(65))
        .build();

    public Bucket bucket(String key, Function<String, Bucket> supplier) {
        return cache.get(key, supplier);
    }

    public void clear() {
        cache.invalidateAll();
    }
}
