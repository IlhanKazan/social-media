package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.dto.admin.SystemMessageResponse;
import com.ilhankazan.social.event.UserBannedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class AdminEventListener {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handleUserBanned(UserBannedEvent event) {
        SystemMessageResponse payload = new SystemMessageResponse(
            "ACCOUNT_SUSPENDED",
            "Hesabınız kuralları ihlal ettiği gerekçesiyle askıya alındı. Nedeni: " + event.reason()
        );

        messagingTemplate.convertAndSendToUser(
            event.username(),
            "/queue/system",
            payload
        );
    }
}
