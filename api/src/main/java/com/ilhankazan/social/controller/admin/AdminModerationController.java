package com.ilhankazan.social.controller.admin;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.manager.AdminModerationManager;
import com.ilhankazan.social.repository.projection.ReportGroupProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminModerationController {

    private final AdminModerationManager adminModerationManager;

    @GetMapping("/moderation-queue")
    public ResponseEntity<PageResponse<PostResponse>> getModerationQueue(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminModerationManager.getModerationQueue(page, size));
    }

    @PostMapping("/posts/{id}/approve")
    public ResponseEntity<Void> approvePost(@PathVariable Long id) {
        adminModerationManager.approvePost(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/posts/{id}/remove")
    public ResponseEntity<Void> removePost(@PathVariable Long id) {
        adminModerationManager.removePost(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/reports")
    public ResponseEntity<PageResponse<ReportGroupProjection>> getReports(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminModerationManager.getGroupedReports(page, size));
    }

    @PostMapping("/reports/{postId}/resolve")
    public ResponseEntity<Void> resolveReport(
        @PathVariable Long postId,
        @RequestBody Map<String, Object> request) {

        String resolution = (String) request.getOrDefault("resolution", "RESOLVED");
        boolean removePost = (boolean) request.getOrDefault("removePost", false);
        boolean banUser = (boolean) request.getOrDefault("banUser", false);

        adminModerationManager.resolveReport(postId, resolution, removePost, banUser);
        return ResponseEntity.ok().build();
    }
}
