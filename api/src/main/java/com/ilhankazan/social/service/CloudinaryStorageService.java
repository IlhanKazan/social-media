package com.ilhankazan.social.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.apache.tika.Tika;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CloudinaryStorageService {

    private final Cloudinary cloudinary;
    private final Tika tika = new Tika();

    private static final List<String> ALLOWED_MIME_TYPES = List.of(
        "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    public String uploadFile(MultipartFile file, String folder) {
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Dosya boyutu 5MB'dan büyük olamaz.");
        }

        try {
            String detectedType = tika.detect(file.getBytes());

            if (!ALLOWED_MIME_TYPES.contains(detectedType)) {
                throw new IllegalArgumentException("Güvenlik ihlali: Geçersiz dosya formatı. Sadece JPG, PNG, WEBP ve GIF yüklenebilir.");
            }

            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                "folder", "social/" + folder,
                "public_id", UUID.randomUUID().toString()
            ));
            return uploadResult.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Dosya yükleme başarısız", e);
        }
    }
}
