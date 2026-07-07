package com.ilhankazan.social.service;

import com.ilhankazan.social.config.AppProperties;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.RefreshToken;
import com.ilhankazan.social.entity.Role;
import com.ilhankazan.social.exception.TokenReuseDetectedException;
import com.ilhankazan.social.repository.RefreshTokenRepository;
import com.ilhankazan.social.security.JwtTokenProvider;
import com.ilhankazan.social.util.TokenGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RefreshTokenServiceTest {

    private static final long REFRESH_TTL_MS = 30L * 24 * 60 * 60 * 1000;

    private final RefreshTokenRepository repo = mock(RefreshTokenRepository.class);
    private final JwtTokenProvider jwt = mock(JwtTokenProvider.class);
    private final AuditLogService auditLog = mock(AuditLogService.class);
    private final AppProperties.JwtProperties jwtProps =
        new AppProperties.JwtProperties("secret", 900_000L, REFRESH_TTL_MS);

    private final RefreshTokenService service =
        new RefreshTokenService(repo, jwt, jwtProps, auditLog);

    private Account account() {
        Account a = new Account();
        a.setId(7L);
        a.setUsername("alice");
        a.setRole(new Role(1L, "USER"));
        return a;
    }

    private RefreshToken token(Account account, UUID familyId, String plain, Instant expiresAt) {
        RefreshToken r = new RefreshToken();
        r.setAccount(account);
        r.setFamilyId(familyId);
        r.setTokenHash(TokenGenerator.hashToken(plain));
        r.setExpiresAt(expiresAt);
        return r;
    }

    @Test
    void rotateWithValidTokenRevokesOldAndReturnsNewPair() {
        Account account = account();
        UUID familyId = UUID.randomUUID();
        String presented = "valid-refresh-token";
        RefreshToken existing = token(account, familyId, presented,
            Instant.now().plus(1, ChronoUnit.DAYS));

        when(repo.findByTokenHash(TokenGenerator.hashToken(presented)))
            .thenReturn(Optional.of(existing));
        when(jwt.generateRefreshToken("alice")).thenReturn("new-plain-refresh");
        when(jwt.generateAccessToken(eq("alice"), eq(7L), anyList())).thenReturn("new-access");

        RefreshTokenService.RefreshResult result = service.rotate(presented, "agent", "10.0.0.1");

        assertThat(result.accessToken()).isEqualTo("new-access");
        assertThat(result.refreshToken()).isEqualTo("new-plain-refresh");
        assertThat(result.account()).isSameAs(account);

        assertThat(existing.getRevokedAt()).isNotNull();
        assertThat(existing.getReplacedBy())
            .isEqualTo(TokenGenerator.hashToken("new-plain-refresh"));

        verify(repo, times(2)).save(any(RefreshToken.class));
        verify(repo, never()).revokeFamily(any());
        verifyNoInteractions(auditLog);
    }

    @Test
    void rotateWithRevokedTokenTripsReuseDetection() {
        Account account = account();
        UUID familyId = UUID.randomUUID();
        String presented = "already-used-token";
        RefreshToken revoked = token(account, familyId, presented,
            Instant.now().plus(1, ChronoUnit.DAYS));
        revoked.setRevokedAt(Instant.now().minus(1, ChronoUnit.MINUTES));

        when(repo.findByTokenHash(TokenGenerator.hashToken(presented)))
            .thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> service.rotate(presented, "agent", "10.0.0.1"))
            .isInstanceOf(TokenReuseDetectedException.class);

        verify(repo).revokeFamily(familyId);
        verify(auditLog).record(
            eq("TOKEN_REUSE_DETECTED"),
            eq("ACCOUNT"),
            eq(7L),
            eq(Map.<String, Object>of("family_id", familyId)));

        verify(repo, never()).save(any(RefreshToken.class));
        verify(jwt, never()).generateRefreshToken(any());
    }

    @Test
    void rotateWithExpiredTokenThrowsBadCredentials() {
        Account account = account();
        String presented = "expired-token";
        RefreshToken expired = token(account, UUID.randomUUID(), presented,
            Instant.now().minus(1, ChronoUnit.MINUTES));

        when(repo.findByTokenHash(TokenGenerator.hashToken(presented)))
            .thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.rotate(presented, "agent", "10.0.0.1"))
            .isInstanceOf(BadCredentialsException.class)
            .hasMessageContaining("expired");

        verify(repo, never()).save(any(RefreshToken.class));
        verify(repo, never()).revokeFamily(any());
        verifyNoInteractions(auditLog);
    }

    @Test
    void rotateWithUnknownHashThrowsBadCredentials() {
        when(repo.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotate("ghost-token", "agent", "10.0.0.1"))
            .isInstanceOf(BadCredentialsException.class)
            .hasMessageContaining("Invalid");

        verify(repo, never()).save(any(RefreshToken.class));
        verify(repo, never()).revokeFamily(any());
        verifyNoInteractions(auditLog);
    }
}
