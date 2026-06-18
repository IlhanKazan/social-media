package com.ilhankazan.social.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class CloudinaryStorageService {

    private final Cloudinary cloudinary;
    private final Tika tika = new Tika();

    private static final List<String> ALLOWED_MIME_TYPES = List.of(
        "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    public String uploadFile(MultipartFile file, String folder) {
        Map uploadResult = upload(file, folder, false);
        return uploadResult.get("secure_url").toString();
    }

    public String uploadAuthenticatedFile(MultipartFile file, String folder) {
        Map uploadResult = upload(file, folder, true);
        return uploadResult.get("public_id").toString();
    }

    public String signedImageUrl(String publicId) {
        return cloudinary.url()
            .secure(true)
            .signed(true)
            .type("authenticated")
            .generate(publicId);
    }

    private Map upload(MultipartFile file, String folder, boolean authenticated) {
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Dosya boyutu 5MB'dan büyük olamaz.");
        }

        try {
            String detectedType = tika.detect(file.getBytes());

            if (!ALLOWED_MIME_TYPES.contains(detectedType)) {
                throw new IllegalArgumentException("Güvenlik ihlali: Geçersiz dosya formatı. Sadece JPG, PNG, WEBP ve GIF yüklenebilir.");
            }

            Map options = ObjectUtils.asMap(
                "folder", "social/" + folder,
                "public_id", UUID.randomUUID().toString()
            );
            if (authenticated) {
                options.put("type", "authenticated");
            }

            return cloudinary.uploader().upload(file.getBytes(), options);
        } catch (IOException e) {
            throw new RuntimeException("Dosya yükleme başarısız", e);
        }
    }

    public void deleteFileByUrl(String imageUrl) {
        if (imageUrl == null || !imageUrl.contains("res.cloudinary.com")) return;

        try {
            String[] parts = imageUrl.split("/");
            String folderAndFile = parts[parts.length - 2] + "/" + parts[parts.length - 1];
            String publicId = "social/" + folderAndFile.substring(0, folderAndFile.lastIndexOf('.'));

            cloudinary.uploader().destroy(publicId, com.cloudinary.utils.ObjectUtils.emptyMap());
        } catch (Exception e) {
            log.error("Failed to delete image from Cloudinary: {}", imageUrl, e);
        }
    }
}
