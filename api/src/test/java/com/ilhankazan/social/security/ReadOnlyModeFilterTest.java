package com.ilhankazan.social.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.service.SystemSettingsService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReadOnlyModeFilterTest {

    private final SystemSettingsService settings = mock(SystemSettingsService.class);
    private final ReadOnlyModeFilter filter = new ReadOnlyModeFilter(settings, new ObjectMapper());

    @Test
    void blocksWritesWithServiceUnavailableWhenReadOnlyOn() throws Exception {
        when(settings.getBooleanSetting(SystemSettingsService.READ_ONLY_MODE, false)).thenReturn(true);
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(new MockHttpServletRequest("POST", "/api/v1/posts"), res, chain);

        assertThat(res.getStatus()).isEqualTo(503);
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void allowsWritesWhenReadOnlyOff() throws Exception {
        when(settings.getBooleanSetting(SystemSettingsService.READ_ONLY_MODE, false)).thenReturn(false);
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(new MockHttpServletRequest("POST", "/api/v1/posts"), res, chain);

        assertThat(res.getStatus()).isEqualTo(200);
        verify(chain).doFilter(any(), any());
    }

    @Test
    void neverBlocksReadsOrAuthOrAdminEvenWhenReadOnlyOn() throws Exception {
        when(settings.getBooleanSetting(SystemSettingsService.READ_ONLY_MODE, false)).thenReturn(true);

        assertPassesThrough("GET", "/api/v1/posts");
        assertPassesThrough("POST", "/api/v1/auth/login");
        assertPassesThrough("PATCH", "/api/v1/admin/settings/read_only_mode");
    }

    private void assertPassesThrough(String method, String uri) throws Exception {
        FilterChain chain = mock(FilterChain.class);
        filter.doFilter(new MockHttpServletRequest(method, uri), new MockHttpServletResponse(), chain);
        verify(chain).doFilter(any(), any());
    }
}
