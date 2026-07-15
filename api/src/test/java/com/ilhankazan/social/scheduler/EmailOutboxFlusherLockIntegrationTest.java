package com.ilhankazan.social.scheduler;

import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.entity.EmailOutbox;
import com.ilhankazan.social.entity.EmailStatus;
import com.ilhankazan.social.repository.EmailOutboxRepository;
import com.resend.Resend;
import com.resend.services.emails.Emails;
import com.resend.services.emails.model.CreateEmailResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@TestPropertySource(properties = "app.email.enabled=true")
class EmailOutboxFlusherLockIntegrationTest extends BaseIntegrationTest {

    private static final int OUTBOX_LOCK_ID = 7421;

    @Autowired
    private EmailOutboxFlusher flusher;

    @Autowired
    private EmailOutboxRepository outboxRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private Resend resend;

    @TestConfiguration
    static class MockResendConfig {

        @Bean
        @Primary
        Resend mockResend() throws Exception {
            Resend resendMock = mock(Resend.class);
            Emails emailsMock = mock(Emails.class);
            CreateEmailResponse response = mock(CreateEmailResponse.class);
            when(response.getId()).thenReturn("mock-provider-id");
            when(emailsMock.send(any())).thenReturn(response);
            when(resendMock.emails()).thenReturn(emailsMock);
            return resendMock;
        }
    }

    @Test
    void concurrentFlushSkipsWhileLockIsHeldAndLockReleasesWithTheTransaction() throws Exception {
        outboxRepository.deleteAll();

        CountDownLatch lockHeld = new CountDownLatch(1);
        CountDownLatch releaseLock = new CountDownLatch(1);

        Thread competingFlusher = new Thread(() ->
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                // The scheduled flusher may briefly hold the lock; retry until this transaction wins it.
                boolean acquired = false;
                for (int i = 0; i < 100 && !acquired; i++) {
                    acquired = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                        "SELECT pg_try_advisory_xact_lock(?)", Boolean.class, OUTBOX_LOCK_ID));
                    if (!acquired) {
                        try {
                            Thread.sleep(100);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            return;
                        }
                    }
                }
                assertThat(acquired).isTrue();
                lockHeld.countDown();
                try {
                    releaseLock.await(10, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        competingFlusher.start();
        assertThat(lockHeld.await(10, TimeUnit.SECONDS)).isTrue();

        clearInvocations(resend.emails());
        EmailOutbox pending = outboxRepository.save(EmailOutbox.builder()
            .toAddress("lock-test@example.com")
            .subject("advisory lock test")
            .bodyHtml("<p>hi</p>")
            .bodyText("hi")
            .template("test")
            .status(EmailStatus.PENDING)
            .build());

        flusher.flush();

        verify(resend.emails(), never()).send(any());
        assertThat(outboxRepository.findById(pending.getId()).orElseThrow().getStatus())
            .as("while another holder owns the lock, the row must stay pending")
            .isEqualTo(EmailStatus.PENDING);

        releaseLock.countDown();
        competingFlusher.join(10_000);

        EmailStatus status = EmailStatus.PENDING;
        for (int i = 0; i < 50 && status == EmailStatus.PENDING; i++) {
            flusher.flush();
            status = outboxRepository.findById(pending.getId()).orElseThrow().getStatus();
            if (status == EmailStatus.PENDING) {
                Thread.sleep(100);
            }
        }

        assertThat(status)
            .as("once the competing transaction commits, the lock must be free again")
            .isEqualTo(EmailStatus.SENT);
        verify(resend.emails(), times(1)).send(any());
        assertThat(outboxRepository.findById(pending.getId()).orElseThrow().getProviderMessageId())
            .isEqualTo("mock-provider-id");

        outboxRepository.deleteAll();
    }
}
