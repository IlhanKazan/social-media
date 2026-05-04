package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.interaction.InteractionStatusResponse;
import com.ilhankazan.social.manager.InteractionManager;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Interactions", description = "Endpoints for likes, dislikes, and comments on posts")
public class InteractionController {

    private final InteractionManager interactionManager;

    @Operation(summary = "Toggle like", description = "Likes a post, or removes the like if already liked. Removes dislike if present.")
    @ApiResponse(responseCode = "200", description = "Successfully toggled like")
    @ApiResponse(responseCode = "404", description = "Post not found")
    @PostMapping("/like")
    public ResponseEntity<InteractionStatusResponse> toggleLike(@PathVariable Long postId) {
        return ResponseEntity.ok(interactionManager.toggleLike(postId));
    }

    @Operation(summary = "Toggle dislike", description = "Dislikes a post, or removes the dislike if already disliked. Removes like if present.")
    @ApiResponse(responseCode = "200", description = "Successfully toggled dislike")
    @ApiResponse(responseCode = "404", description = "Post not found")
    @PostMapping("/dislike")
    public ResponseEntity<InteractionStatusResponse> toggleDislike(@PathVariable Long postId) {
        return ResponseEntity.ok(interactionManager.toggleDislike(postId));
    }

}
