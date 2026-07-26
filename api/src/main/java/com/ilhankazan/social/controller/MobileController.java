package com.ilhankazan.social.controller;

import com.ilhankazan.social.dto.mobile.MobileVersionResponse;
import com.ilhankazan.social.exception.AppException;
import com.ilhankazan.social.manager.MobileReleaseManager;
import com.ilhankazan.social.security.RateLimit;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/mobile")
@RequiredArgsConstructor
public class MobileController {

    private static final MediaType ANDROID_PACKAGE = MediaType.parseMediaType("application/vnd.android.package-archive");

    // Only a plain .apk basename: no path separators, no "..", no control/quote
    // characters that could break out of the Content-Disposition header value.
    private static final Pattern SAFE_APK_FILENAME = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]*\\.apk$");

    private final MobileReleaseManager mobileReleaseManager;

    @Value("${app.mobile-releases-dir:./mobile-releases}")
    private String releasesDir;

    @RateLimit(capacity = 60, minutes = 1)
    @GetMapping("/version")
    public ResponseEntity<MobileVersionResponse> getVersion() {
        return ResponseEntity.ok(mobileReleaseManager.getCurrentRelease());
    }

    @RateLimit(capacity = 10, minutes = 60)
    @GetMapping("/download/{filename}")
    public ResponseEntity<Resource> download(@PathVariable String filename) {
        if (!SAFE_APK_FILENAME.matcher(filename).matches()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_FILENAME", "Invalid file name");
        }

        Path releasesRoot = Path.of(releasesDir).toAbsolutePath().normalize();
        Path resolved = releasesRoot.resolve(filename).normalize();

        if (!resolved.startsWith(releasesRoot) || !Files.isRegularFile(resolved, LinkOption.NOFOLLOW_LINKS)) {
            throw new AppException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Release file not found");
        }

        // Re-check containment after resolving symlinks, so a symlink placed inside
        // the releases directory can't be used to serve a file from outside it.
        try {
            if (!resolved.toRealPath().startsWith(releasesRoot.toRealPath())) {
                throw new AppException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Release file not found");
            }
        } catch (IOException e) {
            throw new AppException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Release file not found");
        }

        Resource resource = new FileSystemResource(resolved);
        ContentDisposition disposition = ContentDisposition.attachment()
            .filename(resolved.getFileName().toString(), StandardCharsets.UTF_8)
            .build();

        return ResponseEntity.ok()
            .contentType(ANDROID_PACKAGE)
            .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
            .body(resource);
    }
}
