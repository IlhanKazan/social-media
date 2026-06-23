package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.MfaRecoveryCode;
import com.ilhankazan.social.repository.MfaRecoveryCodeRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MfaRecoveryServiceTest {

    private final MfaRecoveryCodeRepository repo = mock(MfaRecoveryCodeRepository.class);
    private final MfaRecoveryService service = new MfaRecoveryService(repo);

    @Test
    void regenerateProducesTenCodesAndReplacesExisting() {
        var codes = service.regenerate(new Account());
        assertThat(codes).hasSize(10).doesNotHaveDuplicates();
        verify(repo).deleteAllForAccount(any());
        verify(repo, times(10)).save(any(MfaRecoveryCode.class));
    }

    @Test
    void consumeMarksCodeUsedOnce() {
        MfaRecoveryCode rc = MfaRecoveryCode.builder().build();
        when(repo.findByAccountIdAndCodeHashAndUsedAtIsNull(eq(1L), any())).thenReturn(Optional.of(rc));

        assertThat(service.consume(1L, "abcDEF1234")).isTrue();
        assertThat(rc.getUsedAt()).isNotNull();
    }

    @Test
    void consumeReturnsFalseWhenNoMatch() {
        when(repo.findByAccountIdAndCodeHashAndUsedAtIsNull(any(), any())).thenReturn(Optional.empty());
        assertThat(service.consume(1L, "nope")).isFalse();
    }
}
