package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.moderation.CreateReportRequest;
import com.ilhankazan.social.dto.moderation.ReportResponse;
import com.ilhankazan.social.manager.ReportManager;
import com.ilhankazan.social.security.RateLimit;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
@Tag(name = "Reports", description = "Endpoints for user content reporting")
public class ReportController {

    private final ReportManager reportManager;

    @RateLimit(capacity = 10, minutes = 60)
    @PostMapping("/posts/{postId}/report")
    public ResponseEntity<Void> reportPost(@PathVariable Long postId, @Valid @RequestBody CreateReportRequest request) {
        reportManager.createReport(postId, request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/me/reports")
    public ResponseEntity<List<ReportResponse>> getMyReports() {
        return ResponseEntity.ok(reportManager.getCurrentUserReports());
    }
}
