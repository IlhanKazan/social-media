package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.dto.search.CombinedSearchResponse;
import com.ilhankazan.social.manager.AccountManager;
import com.ilhankazan.social.manager.PostManager;
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
public class SearchController {

    private final AccountManager accountManager;
    private final PostManager postManager;

    @GetMapping("/users")
    public ResponseEntity<PageResponse<PublicAccountResponse>> searchUsers(
        @RequestParam String q,
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(accountManager.searchAccounts(q, page, size));
    }

    @GetMapping("/posts")
    public ResponseEntity<PageResponse<PostResponse>> searchPosts(
        @RequestParam String q,
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(postManager.searchPosts(q, page, size));
    }

    @GetMapping
    public ResponseEntity<CombinedSearchResponse> searchCombined(
        @RequestParam String q) {
        PageResponse<PublicAccountResponse> users = accountManager.searchAccounts(q, 0, 5);
        PageResponse<PostResponse> posts = postManager.searchPosts(q, 0, 10);

        return ResponseEntity.ok(new CombinedSearchResponse(users.content(), posts.content()));
    }
}
