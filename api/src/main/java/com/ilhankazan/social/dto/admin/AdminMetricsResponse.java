package com.ilhankazan.social.dto.admin;

public record AdminMetricsResponse(
    UserMetrics users,
    PostMetrics posts,
    long openReports,
    long activeSessions,
    EmailMetrics emails
) {
    public record UserMetrics(long total, long banned) {}
    public record PostMetrics(long total, long flagged, long removed) {}
    public record EmailMetrics(long pending, long sentToday, long failed) {}
}
