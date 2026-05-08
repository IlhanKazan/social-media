package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.notification.NotificationResponse;
import com.ilhankazan.social.manager.NotificationManager;
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
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Validated
@Tag(name = "Notifications", description = "Endpoints for retrieving and managing in-app notifications")
public class NotificationController {

    private final NotificationManager notificationManager;

    @Operation(summary = "Get notifications", description = "Returns a paginated list of notifications. Can be filtered by unread status.")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved notifications")
    @GetMapping
    public ResponseEntity<PageResponse<NotificationResponse>> getNotifications(
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
        @RequestParam(defaultValue = "false") boolean unread) {
        return ResponseEntity.ok(notificationManager.getNotifications(page, size, unread));
    }

    @Operation(summary = "Get unread count")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved count")
    @GetMapping("/unread-count")
    public ResponseEntity<Integer> getUnreadCount() {
        return ResponseEntity.ok(notificationManager.getUnreadCount());
    }

    @Operation(summary = "Mark notification as read")
    @ApiResponse(responseCode = "204", description = "Successfully marked as read")
    @ApiResponse(responseCode = "403", description = "Access denied (not owner)")
    @ApiResponse(responseCode = "404", description = "Notification not found")
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationManager.markAsRead(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Mark all notifications as read")
    @ApiResponse(responseCode = "204", description = "Successfully marked all as read")
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        notificationManager.markAllAsRead();
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationManager.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }
}
