package com.ilhankazan.social.security;

import com.ilhankazan.social.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private static final String TYPE_CLAIM = "typ";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";
    private static final String TYPE_MFA = "mfa";

    private final AppProperties.JwtProperties jwtProps;
    private SecretKey key;

    @PostConstruct
    protected void init() {
        this.key = Keys.hmacShaKeyFor(jwtProps.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(String username, Long accountId, List<String> roles) {
        return Jwts.builder()
                .subject(username)
                .id(UUID.randomUUID().toString())
                .claim(TYPE_CLAIM, TYPE_ACCESS)
                .claim("roles", roles)
                .claim("accountId", accountId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtProps.accessTtlMs()))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public static final long MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000L;

    public String generateMfaToken(Long accountId, String tokenId) {
        return Jwts.builder()
                .subject(String.valueOf(accountId))
                .id(tokenId)
                .claim(TYPE_CLAIM, TYPE_MFA)
                .claim("purpose", "mfa")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + MFA_CHALLENGE_TTL_MS))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /** Subject and jti of a challenge token; the jti keys the server-side mfa_challenges row. */
    public record MfaTokenClaims(Long accountId, String tokenId) {}

    public MfaTokenClaims parseMfaToken(String token) {
        Claims claims = validateToken(token);
        String type = claims.get(TYPE_CLAIM, String.class);
        // Tokens minted before the type claim existed carry only "purpose"; they age out
        // with the 5-minute challenge TTL.
        if (type != null && !TYPE_MFA.equals(type)) {
            throw new JwtException("Not an MFA challenge token");
        }
        if (!"mfa".equals(claims.get("purpose", String.class))) {
            throw new JwtException("Not an MFA challenge token");
        }
        if (claims.getId() == null) {
            throw new JwtException("MFA challenge token carries no id");
        }
        return new MfaTokenClaims(Long.valueOf(claims.getSubject()), claims.getId());
    }

    public String generateRefreshToken(String username) {
        return Jwts.builder()
                .subject(username)
                .id(UUID.randomUUID().toString())
                .claim(TYPE_CLAIM, TYPE_REFRESH)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtProps.refreshTtlMs()))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * The only entry point that may authenticate a request. Every token this service mints is
     * signed with the same key, so a valid signature alone proves nothing about what the token
     * is for: without the type check a refresh token (or an MFA challenge token) authenticates
     * API calls as its subject, and refresh-token revocation — logout, logout-all, password
     * reset, reuse detection — never reaches the request path.
     *
     * Throws {@link JwtException} deliberately, so callers treat a wrong-type token exactly like
     * an expired or forged one.
     */
    public Claims parseAccessToken(String token) {
        Claims claims = validateToken(token);

        if (!TYPE_ACCESS.equals(claims.get(TYPE_CLAIM, String.class))) {
            throw new JwtException("Not an access token");
        }
        if (claims.get("accountId", Long.class) == null) {
            throw new JwtException("Access token carries no accountId");
        }

        return claims;
    }
}
