package com.ilhankazan.social.controller.admin;

import com.ilhankazan.social.dto.admin.MobileReleaseRequest;
import com.ilhankazan.social.dto.mobile.MobileVersionResponse;
import com.ilhankazan.social.manager.MobileReleaseManager;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/mobile-release")
@RequiredArgsConstructor
public class AdminMobileReleaseController {

    private final MobileReleaseManager mobileReleaseManager;

    @GetMapping
    public ResponseEntity<MobileVersionResponse> getCurrent() {
        return ResponseEntity.ok(mobileReleaseManager.getCurrentRelease());
    }

    @PutMapping
    public ResponseEntity<Void> update(@Valid @RequestBody MobileReleaseRequest request) {
        mobileReleaseManager.updateRelease(request);
        return ResponseEntity.ok().build();
    }
}
