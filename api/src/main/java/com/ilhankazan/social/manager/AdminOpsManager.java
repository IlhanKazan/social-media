package com.ilhankazan.social.manager;

import com.ilhankazan.social.security.RateLimitStore;
import com.ilhankazan.social.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AdminOpsManager {

    private final CacheManager cacheManager;
    private final RateLimitStore rateLimitStore;
    private final AuditLogService auditLogService;

    public Collection<String> listCaches() {
        return cacheManager.getCacheNames();
    }

    public void invalidateCache(String name) {
        if (StringUtils.hasText(name)) {
            Cache cache = cacheManager.getCache(name);
            if (cache == null) {
                throw new IllegalArgumentException("Unknown cache: " + name);
            }
            cache.clear();
        } else {
            cacheManager.getCacheNames().forEach(n -> {
                Cache c = cacheManager.getCache(n);
                if (c != null) {
                    c.clear();
                }
            });
        }
        auditLogService.record("CACHE_INVALIDATED", "SYSTEM", null,
            Map.of("name", StringUtils.hasText(name) ? name : "*"));
    }

    public void resetRateLimits() {
        rateLimitStore.clear();
        auditLogService.record("RATE_LIMIT_RESET", "SYSTEM", null, null);
    }
}
