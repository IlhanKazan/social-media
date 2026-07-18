package com.ilhankazan.social.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;

@Configuration
@RequiredArgsConstructor
public class FirebaseConfig {

    private final AppProperties.FirebaseProperties firebaseProps;

    @Bean
    @ConditionalOnProperty(prefix = "app.firebase", name = "enabled", havingValue = "true")
    public FirebaseApp firebaseApp() throws IOException {
        try (FileInputStream serviceAccount = new FileInputStream(firebaseProps.credentialsPath())) {
            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();
            return FirebaseApp.initializeApp(options);
        }
    }
}
