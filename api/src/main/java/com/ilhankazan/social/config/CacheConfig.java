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
            Caffeine.newBuilder().expireAfterWrite(60, TimeUnit.SECONDS).maximumSize(1000).build());

        cacheManager.registerCustomCache("publicProfilesByUsername",
            Caffeine.newBuilder().expireAfterWrite(30, TimeUnit.SECONDS).maximumSize(1000).build());

        cacheManager.registerCustomCache("unreadNotificationCount",
            Caffeine.newBuilder().expireAfterWrite(5, TimeUnit.SECONDS).maximumSize(1000).build());

        cacheManager.registerCustomCache("suggestions",
            Caffeine.newBuilder().expireAfterWrite(5, TimeUnit.MINUTES).maximumSize(1000).build());

        return cacheManager;
    }
}
