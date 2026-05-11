package com.ilhankazan.social.controller.admin;

import com.ilhankazan.social.dto.admin.AdminMetricsResponse;
import com.ilhankazan.social.manager.AdminMetricsManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminMetricsManager adminMetricsManager;

    @GetMapping("/metrics")
    public ResponseEntity<AdminMetricsResponse> getMetrics() {
        return ResponseEntity.ok(adminMetricsManager.getMetrics());
    }
}
