package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Conversation;
import com.ilhankazan.social.entity.Message;
import com.ilhankazan.social.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;

    @Transactional
    public Message create(Conversation conversation, Account sender, String content) {
        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(content);
        return messageRepository.save(message);
    }

    @Transactional(readOnly = true)
    public Page<Message> findByConversationId(Long conversationId, Pageable pageable) {
        return messageRepository.findByConversationId(conversationId, pageable);
    }

    @Transactional
    public void markAsRead(Long conversationId, Long receiverId) {
        messageRepository.markAsRead(conversationId, receiverId);
    }

    @Transactional(readOnly = true)
    public int countUnread(Long conversationId, Long userId) {
        return messageRepository.countUnreadMessages(conversationId, userId);
    }
}
