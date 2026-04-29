package com.ilhankazan.social.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ilhankazan.social.base.BaseIntegrationTest;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.dto.auth.RegisterRequest;
import com.ilhankazan.social.dto.message.ConversationResponse;
import com.ilhankazan.social.manager.MessageManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MessageIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MessageManager messageManager;

    private AuthResponse registerAndGetAuth(String username) throws Exception {
        RegisterRequest req = new RegisterRequest(username, username + "@example.com", "Pass123!", username);

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Forwarded-For", java.util.UUID.randomUUID().toString());
        HttpEntity<RegisterRequest> entity = new HttpEntity<>(req, headers);

        ResponseEntity<String> res = restTemplate.postForEntity("/api/v1/auth/register", entity, String.class);
        if (!res.getStatusCode().is2xxSuccessful()) throw new RuntimeException("Reg failed: " + res.getBody());
        return objectMapper.readValue(res.getBody(), AuthResponse.class);
    }

    private void setSecurityContext(String username) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            username, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void shouldCreateConversationAndManageMessages() throws Exception {
        AuthResponse userA = registerAndGetAuth("dm_user_a");
        AuthResponse userB = registerAndGetAuth("dm_user_b");

        HttpHeaders headersA = new HttpHeaders();
        headersA.setBearerAuth(userA.accessToken());

        HttpHeaders headersB = new HttpHeaders();
        headersB.setBearerAuth(userB.accessToken());

        ResponseEntity<String> convRes = restTemplate.exchange("/api/v1/conversations/with/" + userB.account().id(), HttpMethod.POST, new HttpEntity<>(headersA), String.class);
        assertThat(convRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        ConversationResponse conversation = objectMapper.readValue(convRes.getBody(), ConversationResponse.class);
        assertThat(conversation.otherParticipant().username()).isEqualTo("dm_user_b");

        setSecurityContext("dm_user_a");
        messageManager.sendMessage(conversation.id(), "Naber B, projeyi bitiriyoruz!");
        SecurityContextHolder.clearContext();

        ResponseEntity<String> getMsgsRes = restTemplate.exchange("/api/v1/conversations/" + conversation.id() + "/messages", HttpMethod.GET, new HttpEntity<>(headersB), String.class);
        assertThat(getMsgsRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getMsgsRes.getBody()).contains("Naber B, projeyi bitiriyoruz!");

        ResponseEntity<String> readRes = restTemplate.exchange("/api/v1/conversations/" + conversation.id() + "/read", HttpMethod.PUT, new HttpEntity<>(headersB), String.class);
        assertThat(readRes.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT); // 204

        ResponseEntity<String> listRes = restTemplate.exchange("/api/v1/conversations", HttpMethod.GET, new HttpEntity<>(headersB), String.class);
        assertThat(listRes.getBody()).contains("\"unreadCount\":0");
    }
}
