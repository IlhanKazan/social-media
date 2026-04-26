package com.ilhankazan.social.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CloudinaryStorageService{

    private final Cloudinary cloudinary;

    public String uploadFile(MultipartFile file, String folder) {
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Dosya boyutu 5MB'dan büyük olamaz.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Sadece resim dosyaları yüklenebilir.");
        }

        try {
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
