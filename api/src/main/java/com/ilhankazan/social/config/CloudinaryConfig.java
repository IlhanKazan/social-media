package com.ilhankazan.social.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class CloudinaryConfig {

    private final AppProperties.CloudinaryProperties cloudinaryProps;

    @Bean
    public Cloudinary cloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
            "cloud_name", cloudinaryProps.cloudName(),
            "api_key", cloudinaryProps.apiKey(),
            "api_secret", cloudinaryProps.apiSecret()
        ));
    }
}
