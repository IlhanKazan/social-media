package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.device.RegisterDeviceRequest;
import com.ilhankazan.social.manager.DeviceManager;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/devices")
@RequiredArgsConstructor
@Tag(name = "Devices", description = "FCM device token registration for push notifications")
public class DeviceController {

    private final DeviceManager deviceManager;

    @Operation(summary = "Register (or refresh) a device token for push notifications")
    @ApiResponse(responseCode = "204", description = "Token registered")
    @PostMapping
    public ResponseEntity<Void> registerDevice(@Valid @RequestBody RegisterDeviceRequest request) {
        deviceManager.registerDevice(request.token(), request.platform());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Unregister a device token (called on logout)")
    @ApiResponse(responseCode = "204", description = "Token unregistered")
    @DeleteMapping("/{token}")
    public ResponseEntity<Void> unregisterDevice(@PathVariable String token) {
        deviceManager.unregisterDevice(token);
        return ResponseEntity.noContent().build();
    }
}
