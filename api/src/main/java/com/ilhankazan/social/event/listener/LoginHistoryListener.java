package com.ilhankazan.social.event.listener;

import com.ilhankazan.social.entity.LoginHistory;
import com.ilhankazan.social.event.LoginSuccessEvent;
import com.ilhankazan.social.repository.LoginHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class LoginHistoryListener {

    private final LoginHistoryRepository loginHistoryRepository;

    @Async
    @EventListener
    @Transactional
    public void handleLoginSuccess(LoginSuccessEvent event) {
        LoginHistory history = new LoginHistory();
        history.setAccount(event.account());
        history.setIpAddress(event.ipAddress());
        history.setUserAgent(event.userAgent());
        loginHistoryRepository.save(history);
    }
}
