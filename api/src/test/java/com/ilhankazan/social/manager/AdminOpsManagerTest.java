package com.ilhankazan.social.manager;

import com.ilhankazan.social.security.RateLimitStore;
import com.ilhankazan.social.service.AuditLogService;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminOpsManagerTest {

    @Test
    void invalidateAllClearsEveryCacheAndAudits() {
        CacheManager cacheManager = mock(CacheManager.class);
        AuditLogService audit = mock(AuditLogService.class);
        Cache c1 = mock(Cache.class);
        Cache c2 = mock(Cache.class);
        when(cacheManager.getCacheNames()).thenReturn(List.of("a", "b"));
        when(cacheManager.getCache("a")).thenReturn(c1);
        when(cacheManager.getCache("b")).thenReturn(c2);

        new AdminOpsManager(cacheManager, mock(RateLimitStore.class), audit).invalidateCache(null);

        verify(c1).clear();
        verify(c2).clear();
        verify(audit).record(eq("CACHE_INVALIDATED"), eq("SYSTEM"), isNull(), anyMap());
    }

    @Test
    void invalidateOneClearsOnlyNamedCache() {
        CacheManager cacheManager = mock(CacheManager.class);
        Cache c1 = mock(Cache.class);
        when(cacheManager.getCache("suggestions")).thenReturn(c1);

        new AdminOpsManager(cacheManager, mock(RateLimitStore.class), mock(AuditLogService.class))
            .invalidateCache("suggestions");

        verify(c1).clear();
        verify(cacheManager, never()).getCacheNames();
    }

    @Test
    void resetRateLimitsClearsStoreAndAudits() {
        RateLimitStore store = mock(RateLimitStore.class);
        AuditLogService audit = mock(AuditLogService.class);

        new AdminOpsManager(mock(CacheManager.class), store, audit).resetRateLimits();

        verify(store).clear();
        verify(audit).record(eq("RATE_LIMIT_RESET"), eq("SYSTEM"), isNull(), isNull());
    }
}
