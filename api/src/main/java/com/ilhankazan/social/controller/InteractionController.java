package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.interaction.CommentRequest;
import com.ilhankazan.social.dto.interaction.CommentResponse;
import com.ilhankazan.social.dto.interaction.InteractionStatusResponse;
import com.ilhankazan.social.manager.InteractionManager;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/posts/{postId}/interactions")
@RequiredArgsConstructor
@Validated
public class InteractionController {

    private final InteractionManager interactionManager;

    @PostMapping("/like")
    public ResponseEntity<InteractionStatusResponse> toggleLike(@PathVariable Long postId) {
        return ResponseEntity.ok(interactionManager.toggleLike(postId));
    }

    @PostMapping("/dislike")
    public ResponseEntity<InteractionStatusResponse> toggleDislike(@PathVariable Long postId) {
        return ResponseEntity.ok(interactionManager.toggleDislike(postId));
    }

    @PostMapping("/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable Long postId,
            @Valid @RequestBody CommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(interactionManager.addComment(postId, request.content()));
    }

    @GetMapping("/comments")
    public ResponseEntity<PageResponse<CommentResponse>> getComments(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(interactionManager.getComments(postId, page, size));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long postId,
            @PathVariable Long commentId) {
        interactionManager.deleteComment(postId, commentId);
        return ResponseEntity.noContent().build();
    }
}
