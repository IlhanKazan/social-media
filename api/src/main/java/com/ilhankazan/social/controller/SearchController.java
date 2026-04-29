package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.dto.search.CombinedSearchResponse;
import com.ilhankazan.social.manager.AccountManager;
import com.ilhankazan.social.manager.PostManager;
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
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Validated
@Tag(name = "Search", description = "Endpoints for global search across users and posts")
public class SearchController {

    private final AccountManager accountManager;
    private final PostManager postManager;

    @Operation(summary = "Search users", description = "Searches accounts by username or display name.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved users")
    @GetMapping("/users")
    public ResponseEntity<PageResponse<PublicAccountResponse>> searchUsers(
        @RequestParam String q,
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(accountManager.searchAccounts(q, page, size));
    }

    @Operation(summary = "Search posts", description = "Searches posts by content.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved posts")
    @GetMapping("/posts")
    public ResponseEntity<PageResponse<PostResponse>> searchPosts(
        @RequestParam String q,
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(postManager.searchPosts(q, page, size));
    }

    @Operation(summary = "Combined search", description = "Returns a mixed result of top users and posts for the search query.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved combined results")
    @GetMapping
    public ResponseEntity<CombinedSearchResponse> searchCombined(
        @RequestParam String q) {
        PageResponse<PublicAccountResponse> users = accountManager.searchAccounts(q, 0, 5);
        PageResponse<PostResponse> posts = postManager.searchPosts(q, 0, 10);

        return ResponseEntity.ok(new CombinedSearchResponse(users.content(), posts.content()));
    }
}
