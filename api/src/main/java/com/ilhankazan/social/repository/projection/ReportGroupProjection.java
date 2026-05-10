package com.ilhankazan.social.repository.projection;

import java.time.Instant;

public interface ReportGroupProjection {
    Long getPostId();
    Long getReportCount();
    Instant getLatestReportedAt();
}
