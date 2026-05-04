package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.post.CreatePostRequest;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.dto.post.UpdatePostRequest;
import com.ilhankazan.social.manager.PostManager;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
@Validated
@Tag(name = "Posts", description = "Endpoints for post creation, feeds, and fetching replies")
public class PostController {

    private final PostManager postManager;

    @Operation(summary = "Create a new post", description = "Creates a post or reply if parentPostId is provided.")
    @ApiResponse(responseCode = "201", description = "Post successfully created")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @PostMapping
    public ResponseEntity<PostResponse> create(@Valid @RequestBody CreatePostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postManager.create(request));
    }

    @Operation(summary = "Get a specific post", description = "Retrieves a post by its ID.")
    @ApiResponse(responseCode = "200", description = "Post retrieved successfully")
    @ApiResponse(responseCode = "404", description = "Post not found or soft-deleted")
    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(postManager.getById(id));
    }

    @Operation(summary = "Update a post", description = "Updates the content or image of an existing post. Only the author can perform this action.")
    @ApiResponse(responseCode = "200", description = "Post successfully updated")
    @ApiResponse(responseCode = "403", description = "Access denied")
    @PatchMapping("/{id}")
    public ResponseEntity<PostResponse> update(@PathVariable Long id, @Valid @RequestBody UpdatePostRequest request) {
        return ResponseEntity.ok(postManager.update(id, request));
    }

    @Operation(summary = "Delete a post", description = "Soft deletes a post. Cascades to replies and interactions. Only the author or admin can perform this action.")
    @ApiResponse(responseCode = "204", description = "Post successfully deleted")
    @ApiResponse(responseCode = "403", description = "Access denied")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDelete(@PathVariable Long id) {
        postManager.softDelete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get user's feed", description = "Returns a paginated feed of posts from users the current user follows, plus their own posts.")
    @GetMapping("/feed")
    public ResponseEntity<PageResponse<PostResponse>> getFeed(
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(postManager.getFeed(page, size));
    }

    @Operation(summary = "Get global feed", description = "Returns top-level posts ordered by newest first.")
    @GetMapping("/explore")
    public ResponseEntity<PageResponse<PostResponse>> getExplore(
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(postManager.getExplore(page, size));
    }

    @Operation(summary = "Get profile feed", description = "Returns a paginated list of top-level posts for a specific user.")
    @GetMapping("/by-user/{username}")
    public ResponseEntity<PageResponse<PostResponse>> getProfileFeed(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(postManager.getProfileFeed(username, page, size));
    }

    @Operation(summary = "Get replies", description = "Returns a paginated list of replies to a specific post.")
    @GetMapping("/{id}/replies")
    public ResponseEntity<PageResponse<PostResponse>> getReplies(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(postManager.getReplies(id, page, size));
    }

    @Operation(summary = "Get user's replies", description = "Returns a paginated list of replies made by a specific user.")
    @GetMapping("/by-user/{username}/replies")
    public ResponseEntity<PageResponse<PostResponse>> getProfileReplies(
        @PathVariable String username,
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(postManager.getProfileReplies(username, page, size));
    }

    @Operation(summary = "Get user's liked posts", description = "Returns a paginated list of posts liked by a specific user.")
    @GetMapping("/by-user/{username}/likes")
    public ResponseEntity<PageResponse<PostResponse>> getProfileLikes(
        @PathVariable String username,
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(postManager.getProfileLikes(username, page, size));
    }

    @Operation(summary = "Upload post image", description = "Uploads an image before creating a post. Returns the secure URL.")
    @ApiResponse(responseCode = "200", description = "Image successfully uploaded")
    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        String url = postManager.uploadPostImage(file);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
