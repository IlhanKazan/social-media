package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.follow.FollowStatusResponse;
import com.ilhankazan.social.manager.FollowManager;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/follow")
@RequiredArgsConstructor
@Validated
public class FollowController {

    private final FollowManager followManager;

    @PostMapping("/{accountId}")
    public ResponseEntity<Void> follow(@PathVariable Long accountId) {
        followManager.follow(accountId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{accountId}")
    public ResponseEntity<Void> unfollow(@PathVariable Long accountId) {
        followManager.unfollow(accountId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/followers/{accountId}")
    public ResponseEntity<PageResponse<PublicAccountResponse>> getFollowers(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(followManager.getFollowers(accountId, page, size));
    }

    @GetMapping("/following/{accountId}")
    public ResponseEntity<PageResponse<PublicAccountResponse>> getFollowing(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(followManager.getFollowing(accountId, page, size));
    }

    @GetMapping("/is-following/{accountId}")
    public ResponseEntity<FollowStatusResponse> isFollowing(@PathVariable Long accountId) {
        return ResponseEntity.ok(followManager.isFollowing(accountId));
    }
}
