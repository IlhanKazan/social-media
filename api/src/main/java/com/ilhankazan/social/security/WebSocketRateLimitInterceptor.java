package com.ilhankazan.social.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketRateLimitInterceptor implements ChannelInterceptor {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.SEND.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if ("/app/dm.send".equals(destination)) {
                String username = accessor.getUser() != null ? accessor.getUser().getName() : "anonymous";
                Bucket bucket = cache.computeIfAbsent("ws:" + username, k -> {
                    Bandwidth limit = Bandwidth.classic(30, Refill.greedy(30, Duration.ofMinutes(1)));
                    return Bucket.builder().addLimit(limit).build();
                });

                if (!bucket.tryConsume(1)) {
                    throw new IllegalArgumentException("Rate limit exceeded for direct messages.");
                }
            }
        }
        return message;
    }
}
