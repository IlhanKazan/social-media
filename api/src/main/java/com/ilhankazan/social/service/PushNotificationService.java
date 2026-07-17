package com.ilhankazan.social.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.entity.DeviceToken;
import com.ilhankazan.social.repository.DeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private final Optional<FirebaseApp> firebaseApp;
    private final AppProperties.FirebaseProperties firebaseProps;
    private final DeviceTokenRepository deviceTokenRepository;

    @Transactional
    public void send(Long accountId, String title, String body, Map<String, String> data) {
        if (!firebaseProps.enabled() || firebaseApp.isEmpty()) {
            return;
        }

        FirebaseMessaging messaging = FirebaseMessaging.getInstance(firebaseApp.get());

        for (DeviceToken deviceToken : deviceTokenRepository.findByAccountId(accountId)) {
            Message message = Message.builder()
                .setToken(deviceToken.getToken())
                .setNotification(Notification.builder().setTitle(title).setBody(body).build())
                .putAllData(data)
                .build();

            try {
                messaging.send(message);
            } catch (FirebaseMessagingException e) {
                if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                    deviceToken.softDelete();
                } else {
                    log.warn("FCM send failed for account {}: {}", accountId, e.getMessage());
                }
            }
        }
    }
}
