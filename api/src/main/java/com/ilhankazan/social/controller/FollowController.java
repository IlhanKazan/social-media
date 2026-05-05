package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.follow.FollowStatusResponse;
import com.ilhankazan.social.manager.FollowManager;
import com.ilhankazan.social.security.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Follows", description = "Endpoints for managing user follow relationships")
public class FollowController {

    private final FollowManager followManager;

    @Operation(summary = "Follow a user", description = "Follows the target account. Idempotent operation.")
    @ApiResponse(responseCode = "204", description = "Successfully followed")
    @ApiResponse(responseCode = "400", description = "Cannot follow yourself")
    @ApiResponse(responseCode = "404", description = "Target user not found")
    @RateLimit(capacity = 60, minutes = 5)
    @PostMapping("/{accountId}")
    public ResponseEntity<Void> follow(@PathVariable Long accountId) {
        followManager.follow(accountId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Unfollow a user")
    @ApiResponse(responseCode = "204", description = "Successfully unfollowed")
    @DeleteMapping("/{accountId}")
    public ResponseEntity<Void> unfollow(@PathVariable Long accountId) {
        followManager.unfollow(accountId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get followers", description = "Returns a paginated list of users following the specified account.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved followers")
    @GetMapping("/followers/{accountId}")
    public ResponseEntity<PageResponse<PublicAccountResponse>> getFollowers(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(followManager.getFollowers(accountId, page, size));
    }

    @Operation(summary = "Get following", description = "Returns a paginated list of users the specified account is following.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved following")
    @GetMapping("/following/{accountId}")
    public ResponseEntity<PageResponse<PublicAccountResponse>> getFollowing(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(followManager.getFollowing(accountId, page, size));
    }

    @Operation(summary = "Check follow status", description = "Returns true if the current user is following the target account.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved status")
    @GetMapping("/is-following/{accountId}")
    public ResponseEntity<FollowStatusResponse> isFollowing(@PathVariable Long accountId) {
        return ResponseEntity.ok(followManager.isFollowing(accountId));
    }
}
