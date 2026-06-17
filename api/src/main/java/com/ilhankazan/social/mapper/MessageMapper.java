package com.ilhankazan.social.mapper;

import com.ilhankazan.social.dto.message.MessageResponse;
import com.ilhankazan.social.dto.message.SharedPostPreview;
import com.ilhankazan.social.entity.Message;
import com.ilhankazan.social.entity.Post;
import jakarta.persistence.EntityNotFoundException;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel = "spring", uses = {AccountMapper.class})
public abstract class MessageMapper {

    @Autowired
    protected AccountMapper accountMapper;

    @Mapping(target = "sender", source = "sender", qualifiedByName = "noFollow")
    @Mapping(target = "conversationId", source = "conversation.id")
    @Mapping(target = "sharedPost", expression = "java(toPreview(message.getSharedPost()))")
    public abstract MessageResponse toResponse(Message message);

    protected SharedPostPreview toPreview(Post post) {
        if (post == null) return null;
        try {
            String content = post.getContent();
            String snippet = content != null && content.length() > 140
                ? content.substring(0, 137) + "..."
                : content;
            return new SharedPostPreview(
                post.getId(),
                accountMapper.toPublicResponseNoFollow(post.getAccount()),
                snippet,
                post.getImageUrl()
            );
        } catch (EntityNotFoundException e) {
            return null;
        }
    }
}
