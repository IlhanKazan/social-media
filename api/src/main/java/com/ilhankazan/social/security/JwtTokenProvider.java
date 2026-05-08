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
