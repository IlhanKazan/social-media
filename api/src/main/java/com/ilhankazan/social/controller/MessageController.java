package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.message.ConversationResponse;
import com.ilhankazan.social.dto.message.MessageResponse;
import com.ilhankazan.social.manager.MessageManager;
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
public class MessageController {

    private final MessageManager messageManager;

    @GetMapping
    public ResponseEntity<PageResponse<ConversationResponse>> getConversations(
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(messageManager.getConversations(page, size));
    }

    @PostMapping("/with/{accountId}")
    public ResponseEntity<ConversationResponse> getOrCreateConversation(@PathVariable Long accountId) {
        return ResponseEntity.ok(messageManager.getOrCreateConversation(accountId));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<PageResponse<MessageResponse>> getMessages(
        @PathVariable Long id,
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(messageManager.getMessages(id, page, size));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        messageManager.markAsRead(id);
        return ResponseEntity.noContent().build();
    }
}
