package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.post.CreatePostRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class PostImageUrlValidationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void rejectsImageUrlsThatDidNotComeFromTheUploadEndpoint() throws Exception {
        HttpHeaders headers = authHeaders("imgurl-user");

        ResponseEntity<String> external = createPost(headers, "https://evil.example.com/tracker.png");
        assertThat(external.getStatusCode())
            .as("arbitrary external image URL must be rejected")
            .isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<String> dataUri = createPost(headers, "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=");
        assertThat(dataUri.getStatusCode())
            .as("data: URIs must be rejected")
            .isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<String> foreignCloud = createPost(headers, "https://res.cloudinary.com/attacker-cloud/image/upload/x.png");
        assertThat(foreignCloud.getStatusCode())
            .as("another Cloudinary account's URL must be rejected")
            .isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<String> ownCloud = createPost(headers, "https://res.cloudinary.com/test-cloud/image/upload/social/posts/abc.jpg");
        assertThat(ownCloud.getStatusCode())
            .as("URL from our own Cloudinary account must be accepted: " + ownCloud.getBody())
            .isEqualTo(HttpStatus.CREATED);

        ResponseEntity<String> noImage = createPost(headers, null);
        assertThat(noImage.getStatusCode())
            .as("posts without an image stay unaffected")
            .isEqualTo(HttpStatus.CREATED);
    }

    private ResponseEntity<String> createPost(HttpHeaders headers, String imageUrl) {
        CreatePostRequest request = new CreatePostRequest("image url validation check", imageUrl, null);
        return restTemplate.exchange(
            "/api/v1/posts", HttpMethod.POST, new HttpEntity<>(request, headers), String.class);
    }

    private HttpHeaders authHeaders(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/auth/register", new HttpEntity<>(request, new HttpHeaders()), String.class);
        assertThat(response.getStatusCode())
            .as("register helper failed: %s", response.getBody())
            .isEqualTo(HttpStatus.CREATED);
        String token = objectMapper.readValue(response.getBody(), AuthResponse.class).accessToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }
}
