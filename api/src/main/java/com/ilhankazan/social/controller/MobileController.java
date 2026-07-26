package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.mobile.MobileVersionResponse;
import com.ilhankazan.social.exception.AppException;
import com.ilhankazan.social.manager.MobileReleaseManager;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/v1/mobile")
@RequiredArgsConstructor
public class MobileController {

    private static final MediaType ANDROID_PACKAGE = MediaType.parseMediaType("application/vnd.android.package-archive");

    private final MobileReleaseManager mobileReleaseManager;

    @Value("${app.mobile-releases-dir:./mobile-releases}")
    private String releasesDir;

    @GetMapping("/version")
    public ResponseEntity<MobileVersionResponse> getVersion() {
        return ResponseEntity.ok(mobileReleaseManager.getCurrentRelease());
    }

    @GetMapping("/download/{filename}")
    public ResponseEntity<Resource> download(@PathVariable String filename) {
        if (filename.contains("/") || filename.contains("\\") || filename.contains("..") || filename.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_FILENAME", "Invalid file name");
        }

        Path releasesRoot = Path.of(releasesDir).toAbsolutePath().normalize();
        Path resolved = releasesRoot.resolve(filename).normalize();

        if (!resolved.startsWith(releasesRoot)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_FILENAME", "Invalid file name");
        }

        if (!Files.isRegularFile(resolved)) {
            throw new AppException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Release file not found");
        }

        Resource resource = new FileSystemResource(resolved);
        return ResponseEntity.ok()
            .contentType(ANDROID_PACKAGE)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resolved.getFileName() + "\"")
            .body(resource);
    }
}
