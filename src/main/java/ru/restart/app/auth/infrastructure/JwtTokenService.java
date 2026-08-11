package ru.restart.app.auth.infrastructure;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;
import ru.restart.app.auth.application.IssuedTokens;
import ru.restart.app.auth.application.TokenService;
import ru.restart.app.auth.domain.UserAccount;
import ru.restart.app.common.security.AuthenticatedUser;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

@Component
class JwtTokenService implements TokenService {

    private static final String CLAIM_TOKEN_USE = "token_use";
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_ROLE = "role";
    private static final String USE_ACCESS = "access";
    private static final String USE_REFRESH = "refresh";

    private final SecretKey accessKey;
    private final SecretKey refreshKey;
    private final JwtProperties properties;
    private final Clock clock;

    JwtTokenService(JwtProperties properties, Clock clock) {
        this.accessKey = hmacKey(properties.accessSecret(), "app.security.jwt.access-secret");
        this.refreshKey = hmacKey(properties.refreshSecret(), "app.security.jwt.refresh-secret");
        this.properties = properties;
        this.clock = clock;
    }

    private static SecretKey hmacKey(String secret, String propertyName) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    propertyName + " must be set and at least 32 bytes long (256-bit HMAC key)");
        }
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public IssuedTokens issue(UserAccount account) {
        Date now = Date.from(clock.instant());
        String access = Jwts.builder()
                .subject(account.id().toString())
                .claim(CLAIM_TOKEN_USE, USE_ACCESS)
                .claim(CLAIM_EMAIL, account.email())
                .claim(CLAIM_ROLE, account.role().authority())
                .issuedAt(now)
                .expiration(Date.from(clock.instant().plus(properties.accessTokenTtl())))
                .signWith(accessKey)
                .compact();
        String refresh = Jwts.builder()
                .subject(account.id().toString())
                .claim(CLAIM_TOKEN_USE, USE_REFRESH)
                .issuedAt(now)
                .expiration(Date.from(clock.instant().plus(properties.refreshTokenTtl())))
                .signWith(refreshKey)
                .compact();
        return new IssuedTokens(access, refresh, properties.accessTokenTtl().toSeconds());
    }

    @Override
    public Optional<UUID> parseRefreshToken(String refreshToken) {
        return parse(refreshToken, refreshKey, USE_REFRESH)
                .map(claims -> UUID.fromString(claims.getSubject()));
    }

    Optional<AuthenticatedUser> parseAccessToken(String accessToken) {
        return parse(accessToken, accessKey, USE_ACCESS)
                .map(claims -> new AuthenticatedUser(
                        UUID.fromString(claims.getSubject()),
                        claims.get(CLAIM_EMAIL, String.class),
                        claims.get(CLAIM_ROLE, String.class)));
    }

    private Optional<Claims> parse(String token, SecretKey key, String expectedUse) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            if (!expectedUse.equals(claims.get(CLAIM_TOKEN_USE, String.class))) {
                return Optional.empty();
            }
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
