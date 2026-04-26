package com.ilhankazan.social.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

@Service
public class TokenBlacklistService {

    private final Cache<String, Boolean> blacklist = Caffeine.newBuilder()
        .expireAfterWrite(15, TimeUnit.MINUTES)
        .maximumSize(10000)
        .build();

    public void addToBlacklist(String token) {
        blacklist.put(token, Boolean.TRUE);
    }

    public boolean isBlacklisted(String token) {
        return blacklist.getIfPresent(token) != null;
    }
}
