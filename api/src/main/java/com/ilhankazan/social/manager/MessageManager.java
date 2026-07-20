package com.ilhankazan.social.manager;

import com.ilhankazan.social.dto.common.CursorPageResponse;
import com.ilhankazan.social.dto.common.PageResponse;
import com.ilhankazan.social.dto.message.ConversationResponse;
import com.ilhankazan.social.dto.message.MessageResponse;
import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Conversation;
import com.ilhankazan.social.entity.Message;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.event.MessageCreatedEvent;
import com.ilhankazan.social.event.MessagesReadEvent;
import com.ilhankazan.social.mapper.AccountMapper;
import com.ilhankazan.social.mapper.MessageMapper;
import com.ilhankazan.social.service.AccountService;
import com.ilhankazan.social.service.CloudinaryStorageService;
import com.ilhankazan.social.service.ConversationService;
import com.ilhankazan.social.service.MessageService;
import com.ilhankazan.social.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageManager {

    private final ConversationService conversationService;
    private final MessageService messageService;
    private final AccountService accountService;
    private final PostService postService;
    private final CloudinaryStorageService storageService;
    private final MessageMapper messageMapper;
    private final AccountMapper accountMapper;
    private final ApplicationEventPublisher eventPublisher;

    private Account getCurrentAccount() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return accountService.getAccount(username);
    }

    private void verifyParticipant(Conversation conversation, Long accountId) {
        if (!conversation.getParticipantA().getId().equals(accountId) &&
            !conversation.getParticipantB().getId().equals(accountId)) {
            throw new AccessDeniedException("You are not a participant in this conversation");
        }
    }

    @Transactional
    public ConversationResponse getOrCreateConversation(Long targetAccountId) {
        Account current = getCurrentAccount();
        Account target = accountService.getAccountById(targetAccountId);

        if (current.getId().equals(targetAccountId)) {
            throw new IllegalArgumentException("Cannot create conversation with yourself");
        }

        Conversation conversation = conversationService.getOrCreate(current, target);
        int unreadCount = messageService.countUnread(conversation.getId(), current.getId());
        return toConversationResponse(conversation, current.getId(), null, unreadCount);
    }

    @Transactional
    public MessageResponse sendMessage(Long conversationId, String content) {
        return persist(conversationId, content, null, null);
    }

    @Transactional
    public MessageResponse sendImageMessage(Long conversationId, MultipartFile file, String caption) {
        String imagePublicId = storageService.uploadAuthenticatedFile(file, "dm");
        return persist(conversationId, caption, imagePublicId, null);
    }

    @Transactional
    public MessageResponse sharePost(Long conversationId, Long postId, String caption) {
        Post post = postService.getById(postId);
        return persist(conversationId, caption, null, post);
    }

    private MessageResponse persist(Long conversationId, String content, String imagePublicId, Post sharedPost) {
        Account current = getCurrentAccount();
        Conversation conversation = conversationService.getById(conversationId);
        verifyParticipant(conversation, current.getId());

        Message message = messageService.create(
            conversation,
            current,
            StringUtils.hasText(content) ? content : null,
            imagePublicId,
            sharedPost
        );
        conversationService.updateLastMessageAt(conversationId, message.getCreatedAt());

        MessageResponse response = messageMapper.toResponse(message);

        eventPublisher.publishEvent(new MessageCreatedEvent(
            response,
            conversation.getParticipantA().getUsername(),
            conversation.getParticipantB().getUsername()
        ));

        return response;
    }

    @Transactional(readOnly = true)
    public PageResponse<ConversationResponse> getConversations(int page, int size) {
        Account current = getCurrentAccount();
        Page<Conversation> conversations = conversationService.findByParticipantId(
            current.getId(), PageRequest.of(page, size)
        );

        if (conversations.isEmpty()) {
            return PageResponse.of(conversations.map(c -> toConversationResponse(c, current.getId(), null, 0)));
        }

        List<Long> conversationIds = conversations.stream().map(Conversation::getId).toList();
        List<Message> latestMessages = messageService.findLatestMessagesForConversations(conversationIds);
        Map<Long, String> latestMessageMap = latestMessages.stream()
            .collect(Collectors.toMap(
                m -> m.getConversation().getId(),
                messageMapper::previewText
            ));
        Map<Long, Integer> unreadCounts = messageService.countUnreadForConversations(conversationIds, current.getId());

        return PageResponse.of(conversations.map(c ->
            toConversationResponse(c, current.getId(), latestMessageMap.get(c.getId()),
                unreadCounts.getOrDefault(c.getId(), 0))
        ));
    }

    @Transactional(readOnly = true)
    public PageResponse<MessageResponse> getMessages(Long conversationId, int page, int size) {
        Account current = getCurrentAccount();
        Conversation conversation = conversationService.getById(conversationId);
        verifyParticipant(conversation, current.getId());

        Page<Message> messages = messageService.findByConversationId(
            conversationId, PageRequest.of(page, size)
        );
        return PageResponse.of(messages.map(messageMapper::toResponse));
    }

    @Transactional
    public void markAsRead(Long conversationId) {
        Account current = getCurrentAccount();
        Conversation conversation = conversationService.getById(conversationId);
        verifyParticipant(conversation, current.getId());

        messageService.markAsRead(conversationId, current.getId());

        Account otherParticipant = conversation.getParticipantA().getId().equals(current.getId())
            ? conversation.getParticipantB()
            : conversation.getParticipantA();

        eventPublisher.publishEvent(new MessagesReadEvent(
            conversationId,
            otherParticipant.getUsername(),
            Instant.now()
        ));
    }

    private ConversationResponse toConversationResponse(Conversation conversation, Long currentAccountId, String lastMessageContent, int unreadCount) {
        Account otherParticipant = conversation.getParticipantA().getId().equals(currentAccountId)
            ? conversation.getParticipantB()
            : conversation.getParticipantA();

        return new ConversationResponse(
            conversation.getId(),
            accountMapper.toPublicResponseNoFollow(otherParticipant),
            lastMessageContent,
            conversation.getLastMessageAt(),
            unreadCount
        );
    }

    @Transactional(readOnly = true)
    public CursorPageResponse<MessageResponse> getMessagesCursor(Long conversationId, Long before, int size) {
        Account current = getCurrentAccount();
        Conversation conversation = conversationService.getById(conversationId);
        verifyParticipant(conversation, current.getId());

        List<Message> messages = messageService.findThreadPage(conversationId, before, size + 1);
        boolean hasMore = messages.size() > size;

        List<Message> content = hasMore ? messages.subList(0, size) : messages;
        Long nextCursor = content.isEmpty() ? null : content.getLast().getId();

        return new CursorPageResponse<>(
            content.stream().map(messageMapper::toResponse).toList(),
            nextCursor,
            hasMore
        );
    }

    @Transactional(readOnly = true)
    public int getTotalUnreadCount() {
        return messageService.countTotalUnread(getCurrentAccount().getId());
    }

    @Transactional
    public void deleteConversation(Long conversationId) {
        Account current = getCurrentAccount();
        Conversation conversation = conversationService.getById(conversationId);
        verifyParticipant(conversation, current.getId());
        conversationService.hideForParticipant(conversationId, current.getId());
    }
}
