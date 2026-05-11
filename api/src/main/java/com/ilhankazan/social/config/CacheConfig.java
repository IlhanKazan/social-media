package com.ilhankazan.social.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();

        cacheManager.registerCustomCache("accountsByUsername",
            Caffeine.newBuilder().recordStats().expireAfterWrite(60, TimeUnit.SECONDS).maximumSize(1000).build());

        cacheManager.registerCustomCache("publicProfilesByUsername",
            Caffeine.newBuilder().recordStats().expireAfterWrite(30, TimeUnit.SECONDS).maximumSize(1000).build());

        cacheManager.registerCustomCache("unreadNotificationCount",
            Caffeine.newBuilder().recordStats().expireAfterWrite(5, TimeUnit.SECONDS).maximumSize(1000).build());

        cacheManager.registerCustomCache("suggestions",
            Caffeine.newBuilder().recordStats().expireAfterWrite(5, TimeUnit.MINUTES).maximumSize(1000).build());

        cacheManager.registerCustomCache("systemSettings",
            Caffeine.newBuilder().recordStats().expireAfterWrite(30, TimeUnit.SECONDS).maximumSize(100).build());

        return cacheManager;
    }
}
