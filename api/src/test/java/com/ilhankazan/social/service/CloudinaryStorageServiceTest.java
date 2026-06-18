package com.ilhankazan.social.service;

import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CloudinaryStorageServiceTest {

    private final CloudinaryStorageService service =
        new CloudinaryStorageService(new Cloudinary("cloudinary://123456789012345:abcdefghijklmnopqrstuvwxyz12@demo"));

    @Test
    void signedImageUrlIsAuthenticatedAndSigned() {
        String url = service.signedImageUrl("social/dm/abc123");

        assertThat(url)
            .startsWith("https://")
            .contains("/image/authenticated/")
            .contains("s--")
            .contains("social/dm/abc123");
    }
}
