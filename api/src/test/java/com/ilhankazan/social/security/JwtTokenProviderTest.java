package com.ilhankazan.social.security;

import com.ilhankazan.social.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    private static final String SECRET = "test-secret-that-is-comfortably-longer-than-32-bytes";
    private static final long ACCESS_TTL_MS = 900_000L;
    private static final long REFRESH_TTL_MS = 2_592_000_000L;

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider(new AppProperties.JwtProperties(SECRET, ACCESS_TTL_MS, REFRESH_TTL_MS));
        provider.init();
    }

    @Test
    void accessTokenParsesAndCarriesItsClaims() {
        Claims claims = provider.parseAccessToken(provider.generateAccessToken("alice", 7L, List.of("ROLE_USER")));

        assertThat(claims.getSubject()).isEqualTo("alice");
        assertThat(claims.get("accountId", Long.class)).isEqualTo(7L);
        assertThat(claims.get("typ", String.class)).isEqualTo("access");
    }

    @Test
    void refreshTokenCannotAuthenticateARequest() {
        String refreshToken = provider.generateRefreshToken("alice");

        assertThatCode(() -> provider.validateToken(refreshToken))
            .as("the signature is genuine — only the type check separates it from an access token")
            .doesNotThrowAnyException();

        assertThatThrownBy(() -> provider.parseAccessToken(refreshToken))
            .isInstanceOf(JwtException.class)
            .hasMessageContaining("Not an access token");
    }

    @Test
    void mfaChallengeTokenCannotAuthenticateARequest() {
        assertThatThrownBy(() -> provider.parseAccessToken(provider.generateMfaToken(7L, "challenge-1")))
            .isInstanceOf(JwtException.class)
            .hasMessageContaining("Not an access token");
    }

    @Test
    void accessTokenIsNotAcceptedAsAnMfaChallenge() {
        String accessToken = provider.generateAccessToken("alice", 7L, List.of("ROLE_USER"));

        assertThatThrownBy(() -> provider.parseMfaToken(accessToken))
            .isInstanceOf(JwtException.class);
    }

    @Test
    void mfaChallengeTokenParsesToItsSubjectAndId() {
        var claims = provider.parseMfaToken(provider.generateMfaToken(7L, "challenge-1"));

        assertThat(claims.accountId()).isEqualTo(7L);
        assertThat(claims.tokenId())
            .as("the jti is what binds the token to its server-side challenge row")
            .isEqualTo("challenge-1");
    }

    @Test
    void tokenWithoutAccountIdIsRejected() {
        String noAccountId = Jwts.builder()
            .subject("alice")
            .claim("typ", "access")
            .claim("roles", List.of("ROLE_USER"))
            .expiration(future())
            .signWith(signingKey(SECRET), Jwts.SIG.HS256)
            .compact();

        assertThatThrownBy(() -> provider.parseAccessToken(noAccountId))
            .isInstanceOf(JwtException.class)
            .hasMessageContaining("accountId");
    }

    @Test
    void unsecuredAlgNoneTokenIsRejected() {
        assertThatThrownBy(() -> provider.parseAccessToken(unsecured("none", "")))
            .isInstanceOf(JwtException.class);
    }

    @Test
    void unsecuredAlgNoneIsRejectedRegardlessOfCasingOrTrailingGarbage() {
        assertThatThrownBy(() -> provider.parseAccessToken(unsecured("None", "")))
            .isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> provider.parseAccessToken(unsecured("none", "ZmFrZQ")))
            .isInstanceOf(JwtException.class);
    }

    @Test
    void hs256TokenWithAStrippedSignatureIsRejected() {
        assertThatThrownBy(() -> provider.parseAccessToken(unsecured("HS256", "")))
            .isInstanceOf(JwtException.class);
    }

    @Test
    void tokenSignedWithADifferentSecretIsRejected() {
        String forged = Jwts.builder()
            .subject("victim")
            .claim("typ", "access")
            .claim("accountId", 1L)
            .claim("roles", List.of("ROLE_ADMIN"))
            .expiration(future())
            .signWith(signingKey("attacker-secret-that-is-also-longer-than-32-bytes"), Jwts.SIG.HS256)
            .compact();

        assertThatThrownBy(() -> provider.parseAccessToken(forged))
            .isInstanceOf(JwtException.class);
    }

    /** RS256-to-HS256 confusion: the header claims RS256, the signature is an HMAC over a "public key". */
    @Test
    void algorithmConfusionTokenIsRejected() throws Exception {
        String signingInput = header("{\"alg\":\"RS256\",\"typ\":\"JWT\"}") + "." + adminPayload();

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("-----BEGIN PUBLIC KEY-----fake".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String token = signingInput + "." + base64Url(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));

        assertThatThrownBy(() -> provider.parseAccessToken(token))
            .isInstanceOf(JwtException.class);
    }

    /** An embedded JWK must never become the verification key. */
    @Test
    void jwkHeaderInjectionIsRejected() throws Exception {
        String attackerKey = "YXR0YWNrZXItc2VjcmV0LXRoYXQtaXMtMzItYnl0ZXMtbG9uZ3h4";
        String signingInput = header(
            "{\"alg\":\"HS256\",\"typ\":\"JWT\",\"jwk\":{\"kty\":\"oct\",\"k\":\"" + attackerKey + "\"}}")
            + "." + adminPayload();

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(Base64.getUrlDecoder().decode(attackerKey), "HmacSHA256"));
        String token = signingInput + "." + base64Url(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));

        assertThatThrownBy(() -> provider.parseAccessToken(token))
            .isInstanceOf(JwtException.class);
    }

    private static javax.crypto.SecretKey signingKey(String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    private static Date future() {
        return new Date(System.currentTimeMillis() + 99_999_000L);
    }

    private static String unsecured(String alg, String signature) {
        return header("{\"alg\":\"" + alg + "\",\"typ\":\"JWT\"}") + "." + adminPayload() + "." + signature;
    }

    private static String adminPayload() {
        return header("{\"sub\":\"victim\",\"typ\":\"access\",\"accountId\":1,\"roles\":[\"ROLE_ADMIN\"],\"exp\":"
            + (System.currentTimeMillis() / 1000 + 99_999) + "}");
    }

    private static String header(String json) {
        return base64Url(json.getBytes(StandardCharsets.UTF_8));
    }

    private static String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
