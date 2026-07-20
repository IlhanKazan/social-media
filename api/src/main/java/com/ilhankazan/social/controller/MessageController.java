package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.common.CursorPageResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.message.ConversationResponse;
import com.ilhankazan.social.dto.message.MessageResponse;
import com.ilhankazan.social.dto.message.SharePostRequest;
import com.ilhankazan.social.manager.MessageManager;
import com.ilhankazan.social.security.RateLimit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/conversations")
@RequiredArgsConstructor
@Validated
@Tag(name = "Direct Messages", description = "Endpoints for 1-to-1 conversations and message history")
public class MessageController {

    private final MessageManager messageManager;
    private static final Logger log = LoggerFactory.getLogger(MessageController.class);

    @Operation(summary = "Get conversations", description = "Returns the current user's conversations sorted by latest message.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved conversations")
    @GetMapping
    public ResponseEntity<PageResponse<ConversationResponse>> getConversations(
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(messageManager.getConversations(page, size));
    }

    @Operation(summary = "Get or create conversation", description = "Returns an existing conversation with the target user, or creates a new one.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved or created conversation")
    @ApiResponse(responseCode = "400", description = "Cannot create conversation with yourself")
    @ApiResponse(responseCode = "404", description = "Target user not found")
    @PostMapping("/with/{accountId}")
    public ResponseEntity<ConversationResponse> getOrCreateConversation(@PathVariable Long accountId) {
        return ResponseEntity.ok(messageManager.getOrCreateConversation(accountId));
    }

    @Operation(summary = "Get messages (Cursor)", description = "Returns messages using cursor-based pagination.")
    @GetMapping("/{id}/messages/cursor")
    public ResponseEntity<CursorPageResponse<MessageResponse>> getMessagesCursor(
        @PathVariable Long id,
        @RequestParam(required = false) Long before,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(messageManager.getMessagesCursor(id, before, size));
    }

    @Deprecated(forRemoval = true)
    @Operation(summary = "Get messages (Offset) - Deprecated", description = "Use the /cursor endpoint instead.")
    @GetMapping("/{id}/messages")
    public ResponseEntity<PageResponse<MessageResponse>> getMessages(
        @PathVariable Long id,
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        log.warn("Deprecated offset-based message pagination used for conversation {}", id);
        return ResponseEntity.ok(messageManager.getMessages(id, page, size));
    }

    @Operation(summary = "Send an image message", description = "Uploads an image to the conversation and broadcasts it. Optional caption.")
    @ApiResponse(responseCode = "200", description = "Image message sent")
    @ApiResponse(responseCode = "403", description = "Access denied (not a participant)")
    @RateLimit(capacity = 20, minutes = 5)
    @PostMapping(value = "/{id}/messages/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MessageResponse> sendImage(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "caption", required = false) String caption) {
        return ResponseEntity.ok(messageManager.sendImageMessage(id, file, caption));
    }

    @Operation(summary = "Share a post into a conversation", description = "Sends a post as a shareable preview card. Optional caption.")
    @ApiResponse(responseCode = "200", description = "Post shared")
    @ApiResponse(responseCode = "403", description = "Access denied (not a participant)")
    @ApiResponse(responseCode = "404", description = "Post not found")
    @RateLimit(capacity = 30, minutes = 5)
    @PostMapping("/{id}/messages/share")
    public ResponseEntity<MessageResponse> sharePost(
        @PathVariable Long id,
        @Valid @RequestBody SharePostRequest request) {
        return ResponseEntity.ok(messageManager.sharePost(id, request.postId(), request.caption()));
    }

    @Operation(summary = "Mark messages as read", description = "Marks all unread messages from the other participant as read.")
    @ApiResponse(responseCode = "204", description = "Messages successfully marked as read")
    @ApiResponse(responseCode = "403", description = "Access denied (not a participant)")
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        messageManager.markAsRead(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get total unread message count", description = "Returns the total number of unread messages across all conversations.")
    @GetMapping("/unread-count")
    public ResponseEntity<Integer> getUnreadCount() {
        return ResponseEntity.ok(messageManager.getTotalUnreadCount());
    }

    @Operation(summary = "Delete a conversation", description = "Hides the conversation for the current participant only. It reappears automatically when a new message arrives.")
    @ApiResponse(responseCode = "204", description = "Conversation successfully hidden")
    @ApiResponse(responseCode = "403", description = "Access denied (not a participant)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long id) {
        messageManager.deleteConversation(id);
        return ResponseEntity.noContent().build();
    }
}
