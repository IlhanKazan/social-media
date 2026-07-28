package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.mobile.MobileVersionResponse;
import com.ilhankazan.social.manager.MobileReleaseManager;
import com.ilhankazan.social.security.RateLimit;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/mobile")
@RequiredArgsConstructor
public class MobileController {

    private final MobileReleaseManager mobileReleaseManager;

    @RateLimit(capacity = 60, minutes = 1)
    @GetMapping("/version")
    public ResponseEntity<MobileVersionResponse> getVersion() {
        return ResponseEntity.ok(mobileReleaseManager.getCurrentRelease());
    }
}
