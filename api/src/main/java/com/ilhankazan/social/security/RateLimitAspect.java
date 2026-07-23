package com.ilhankazan.social.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {

    private final RateLimitStore rateLimitStore;
    private final ClientIpResolver clientIpResolver;

    @Around("@annotation(rateLimit)")
    public Object enforceRateLimit(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        String keyPrefix;
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            keyPrefix = "user:" + auth.getName();
        } else {
            keyPrefix = "ip:" + clientIpResolver.resolve(request);
        }

        String key = keyPrefix + "-" + joinPoint.getSignature().getName();

        Bucket bucket = rateLimitStore.bucket(key, k -> {
            Bandwidth limit = Bandwidth.classic(
                rateLimit.capacity(),
                Refill.greedy(rateLimit.capacity(), Duration.ofMinutes(rateLimit.minutes()))
            );
            return Bucket.builder().addLimit(limit).build();
        });

        if (!bucket.tryConsume(1)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please try again later.");
        }

        return joinPoint.proceed();
    }
}
