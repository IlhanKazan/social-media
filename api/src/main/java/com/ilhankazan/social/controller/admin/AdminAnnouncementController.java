package com.ilhankazan.social.controller.admin;

import com.ilhankazan.social.dto.admin.AnnouncementRequest;
import com.ilhankazan.social.manager.AnnouncementManager;
import com.ilhankazan.social.security.RateLimit;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/announcements")
@RequiredArgsConstructor
public class AdminAnnouncementController {

    private final AnnouncementManager announcementManager;

    /** Who would receive it, and whether the monthly allowance covers them. */
    @GetMapping("/audience")
    public ResponseEntity<AnnouncementManager.Audience> audience() {
        return ResponseEntity.ok(announcementManager.preview());
    }

    /**
     * Rate limited despite already requiring an admin: this is the one endpoint
     * where a stuck finger costs the sending reputation of the whole domain.
     */
    @RateLimit(capacity = 3, minutes = 60)
    @PostMapping
    public ResponseEntity<Map<String, Integer>> send(@Valid @RequestBody AnnouncementRequest request) {
        int queued = announcementManager.send(request);
        return ResponseEntity.ok(Map.of("queued", queued));
    }
}
