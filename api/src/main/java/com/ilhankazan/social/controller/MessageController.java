package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.message.ConversationResponse;
import com.ilhankazan.social.dto.message.MessageResponse;
import com.ilhankazan.social.manager.MessageManager;
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
@RequestMapping("/api/v1/conversations")
@RequiredArgsConstructor
@Validated
@Tag(name = "Direct Messages", description = "Endpoints for 1-to-1 conversations and message history")
public class MessageController {

    private final MessageManager messageManager;

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

    @Operation(summary = "Get messages", description = "Returns a paginated list of messages in a conversation, newest first.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved messages")
    @ApiResponse(responseCode = "403", description = "Access denied (not a participant)")
    @ApiResponse(responseCode = "404", description = "Conversation not found")
    @GetMapping("/{id}/messages")
    public ResponseEntity<PageResponse<MessageResponse>> getMessages(
        @PathVariable Long id,
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(messageManager.getMessages(id, page, size));
    }

    @Operation(summary = "Mark messages as read", description = "Marks all unread messages from the other participant as read.")
    @ApiResponse(responseCode = "204", description = "Messages successfully marked as read")
    @ApiResponse(responseCode = "403", description = "Access denied (not a participant)")
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        messageManager.markAsRead(id);
        return ResponseEntity.noContent().build();
    }
}
