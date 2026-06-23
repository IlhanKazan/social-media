package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.MfaCode;
import com.ilhankazan.social.repository.MfaCodeRepository;
import com.ilhankazan.social.service.email.EmailService;
import com.ilhankazan.social.util.TokenGenerator;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MfaEmailServiceTest {

    private final MfaCodeRepository repo = mock(MfaCodeRepository.class);
    private final EmailService email = mock(EmailService.class);
    private final MfaEmailService service = new MfaEmailService(repo, email);

    private Account account() {
        Account a = new Account();
        a.setEmail("u@example.com");
        return a;
    }

    private MfaCode code(String plain, Instant expiresAt, int attempts) {
        return MfaCode.builder()
            .codeHash(TokenGenerator.hashToken(plain))
            .expiresAt(expiresAt)
            .attempts(attempts)
            .build();
    }

    @Test
    void issueCodeInvalidatesPreviousSavesAndEmails() {
        service.issueCode(account());
        verify(repo).invalidateActiveForAccount(any());
        verify(repo).save(any(MfaCode.class));
        verify(email).enqueue(argThat(m -> "MFA_CODE".equals(m.template())));
    }

    @Test
    void verifyAcceptsCorrectCodeOnce() {
        MfaCode c = code("123456", Instant.now().plus(5, ChronoUnit.MINUTES), 0);
        when(repo.findTopByAccountIdAndUsedAtIsNullOrderByCreatedAtDesc(7L)).thenReturn(Optional.of(c));

        assertThat(service.verify(7L, "123456")).isTrue();
        assertThat(c.getUsedAt()).isNotNull();
    }

    @Test
    void verifyRejectsWrongCodeAndCountsAttempt() {
        MfaCode c = code("123456", Instant.now().plus(5, ChronoUnit.MINUTES), 0);
        when(repo.findTopByAccountIdAndUsedAtIsNullOrderByCreatedAtDesc(7L)).thenReturn(Optional.of(c));

        assertThat(service.verify(7L, "000000")).isFalse();
        assertThat(c.getAttempts()).isEqualTo(1);
    }

    @Test
    void verifyRejectsExpiredAndAttemptCappedCodes() {
        when(repo.findTopByAccountIdAndUsedAtIsNullOrderByCreatedAtDesc(7L))
            .thenReturn(Optional.of(code("123456", Instant.now().minus(1, ChronoUnit.MINUTES), 0)));
        assertThat(service.verify(7L, "123456")).isFalse();

        when(repo.findTopByAccountIdAndUsedAtIsNullOrderByCreatedAtDesc(8L))
            .thenReturn(Optional.of(code("123456", Instant.now().plus(5, ChronoUnit.MINUTES), 5)));
        assertThat(service.verify(8L, "123456")).isFalse();
    }
}
