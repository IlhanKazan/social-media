package com.ilhankazan.social.security;

import com.ilhankazan.social.config.AppProperties;
import io.jsonwebtoken.Claims;
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
                .claim("roles", roles)
                .claim("accountId", accountId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtProps.accessTtlMs()))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    private static final long MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000L;

    public String generateMfaToken(Long accountId) {
        return Jwts.builder()
                .subject(String.valueOf(accountId))
                .id(UUID.randomUUID().toString())
                .claim("purpose", "mfa")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + MFA_CHALLENGE_TTL_MS))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Long parseMfaToken(String token) {
        Claims claims = validateToken(token);
        if (!"mfa".equals(claims.get("purpose", String.class))) {
            throw new io.jsonwebtoken.JwtException("Not an MFA challenge token");
        }
        return Long.valueOf(claims.getSubject());
    }

    public String generateRefreshToken(String username) {
        return Jwts.builder()
                .subject(username)
                .id(UUID.randomUUID().toString())
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
}
