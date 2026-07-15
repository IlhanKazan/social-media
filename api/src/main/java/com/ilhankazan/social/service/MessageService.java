package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Conversation;
import com.ilhankazan.social.entity.Message;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import static java.util.stream.Collectors.toMap;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;

    @Transactional
    public Message create(Conversation conversation, Account sender, String content, String imagePublicId, Post sharedPost) {
        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(content);
        message.setImagePublicId(imagePublicId);
        message.setSharedPost(sharedPost);
        return messageRepository.save(message);
    }

    @Transactional(readOnly = true)
    public Page<Message> findByConversationId(Long conversationId, Pageable pageable) {
        return messageRepository.findByConversationId(conversationId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Message> findLatestMessagesForConversations(List<Long> conversationIds) {
        if (conversationIds.isEmpty()) return List.of();
        return messageRepository.findLatestMessagesForConversations(conversationIds);
    }

    @Transactional
    public void markAsRead(Long conversationId, Long receiverId) {
        messageRepository.markAsRead(conversationId, receiverId);
    }

    @Transactional(readOnly = true)
    public int countUnread(Long conversationId, Long userId) {
        return messageRepository.countUnreadMessages(conversationId, userId);
    }

    @Transactional(readOnly = true)
    public Map<Long, Integer> countUnreadForConversations(List<Long> conversationIds, Long userId) {
        if (conversationIds.isEmpty()) return Map.of();
        return messageRepository.countUnreadMessagesForConversations(conversationIds, userId).stream()
            .collect(toMap(row -> (Long) row[0], row -> ((Long) row[1]).intValue()));
    }

    @Transactional(readOnly = true)
    public List<Message> findThreadPage(Long conversationId, Long before, int size) {
        return messageRepository.findThreadPage(conversationId, before, org.springframework.data.domain.PageRequest.of(0, size));
    }

    @Transactional(readOnly = true)
    public int countTotalUnread(Long userId) {
        return messageRepository.countTotalUnreadMessagesForUser(userId);
    }
}
