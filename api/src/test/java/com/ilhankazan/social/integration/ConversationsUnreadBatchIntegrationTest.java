package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.message.ConversationResponse;
import com.ilhankazan.social.manager.MessageManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@TestPropertySource(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
class ConversationsUnreadBatchIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MessageManager messageManager;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void conversationListQueryCountIsIndependentOfConversationCount() throws Exception {
        AuthResponse main = registerAndGetAuth("unread-main");
        AuthResponse peer1 = registerAndGetAuth("unread-peer-1");

        startConversationWithUnreadMessages(peer1, main, 2);

        long statementsWithOneConversation = measureGetConversations(main.account().username());

        AuthResponse peer2 = registerAndGetAuth("unread-peer-2");
        AuthResponse peer3 = registerAndGetAuth("unread-peer-3");
        startConversationWithUnreadMessages(peer2, main, 1);
        startConversationWithUnreadMessages(peer3, main, 3);

        long statementsWithThreeConversations = measureGetConversations(main.account().username());

        assertThat(statementsWithThreeConversations)
            .as("conversation list must issue a constant number of statements, not one unread count per conversation")
            .isEqualTo(statementsWithOneConversation);

        setSecurityContext(main.account().username());
        PageResponse<ConversationResponse> conversations = messageManager.getConversations(0, 20);
        assertThat(conversations.content()).hasSize(3);
        assertThat(conversations.content().stream().map(ConversationResponse::unreadCount))
            .as("batched counts must match the per-conversation unread totals")
            .containsExactlyInAnyOrder(2, 1, 3);
    }

    private long measureGetConversations(String username) {
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        setSecurityContext(username);
        // Background schedulers share the SessionFactory; retry so a stray tick can't skew the count.
        long best = Long.MAX_VALUE;
        for (int i = 0; i < 3; i++) {
            statistics.clear();
            messageManager.getConversations(0, 20);
            best = Math.min(best, statistics.getPrepareStatementCount());
        }
        SecurityContextHolder.clearContext();
        return best;
    }

    private void startConversationWithUnreadMessages(AuthResponse sender, AuthResponse recipient, int messageCount) {
        setSecurityContext(sender.account().username());
        ConversationResponse conversation = messageManager.getOrCreateConversation(recipient.account().id());
        for (int i = 0; i < messageCount; i++) {
            messageManager.sendMessage(conversation.id(), "unread message " + i);
        }
        SecurityContextHolder.clearContext();
    }

    private void setSecurityContext(String username) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            username, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private AuthResponse registerAndGetAuth(String username) throws Exception {
        RegisterRequest request = new RegisterRequest(username, username + "@example.com", "Pass123!", username, true, true);
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/auth/register", new HttpEntity<>(request, new HttpHeaders()), String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Register failed: " + response.getBody());
        }
        return objectMapper.readValue(response.getBody(), AuthResponse.class);
    }
}
