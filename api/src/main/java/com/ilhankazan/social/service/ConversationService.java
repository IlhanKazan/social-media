package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Conversation;
import com.ilhankazan.social.repository.ConversationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;

    @Transactional
    public Conversation getOrCreate(Account account1, Account account2) {
        Long aId = Math.min(account1.getId(), account2.getId());
        Long bId = Math.max(account1.getId(), account2.getId());

        return conversationRepository.findByParticipants(aId, bId)
            .orElseGet(() -> {
                Conversation c = new Conversation();
                c.setParticipantA(account1.getId().equals(aId) ? account1 : account2);
                c.setParticipantB(account1.getId().equals(bId) ? account1 : account2);
                return conversationRepository.save(c);
            });
    }

    @Transactional(readOnly = true)
    public Conversation getById(Long id) {
        return conversationRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Conversation not found"));
    }

    @Transactional
    public void updateLastMessageAt(Long id, Instant time) {
        Conversation c = getById(id);
        c.setLastMessageAt(time);
        conversationRepository.save(c);
    }

    @Transactional(readOnly = true)
    public Page<Conversation> findByParticipantId(Long accountId, Pageable pageable) {
        return conversationRepository.findByParticipantId(accountId, pageable);
    }

    @Transactional
    public void hideForParticipant(Long conversationId, Long accountId) {
        Conversation c = getById(conversationId);
        if (c.getParticipantA().getId().equals(accountId)) {
            c.setHiddenForAAt(Instant.now());
        } else {
            c.setHiddenForBAt(Instant.now());
        }
        conversationRepository.save(c);
    }
}
