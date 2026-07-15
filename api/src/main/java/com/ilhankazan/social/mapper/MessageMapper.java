package com.ilhankazan.social.mapper;

import com.ilhankazan.social.dto.message.MessageResponse;
import com.ilhankazan.social.dto.message.SharedPostPreview;
import com.ilhankazan.social.entity.Message;
import com.ilhankazan.social.entity.Post;
import com.ilhankazan.social.service.CloudinaryStorageService;
import jakarta.persistence.EntityNotFoundException;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;

@Mapper(componentModel = "spring", uses = {AccountMapper.class})
public abstract class MessageMapper {

    @Autowired
    protected AccountMapper accountMapper;

    @Autowired
    protected CloudinaryStorageService storageService;

    @Mapping(target = "sender", source = "sender", qualifiedByName = "noFollow")
    @Mapping(target = "conversationId", source = "conversation.id")
    @Mapping(target = "imageUrl", source = "imagePublicId", qualifiedByName = "signImage")
    @Mapping(target = "sharedPost", expression = "java(toPreview(message.getSharedPost()))")
    public abstract MessageResponse toResponse(Message message);

    @Named("signImage")
    protected String signImage(String publicId) {
        return publicId == null ? null : storageService.signedImageUrl(publicId);
    }

    public String previewText(Message message) {
        if (StringUtils.hasText(message.getContent())) return abbreviate(message.getContent(), 80);
        if (StringUtils.hasText(message.getImagePublicId())) return "📷 Photo";
        if (message.getSharedPost() != null) return "📎 Shared a post";
        return "";
    }

    private String abbreviate(String str, int maxWidth) {
        if (str == null) return null;
        if (str.length() <= maxWidth) return str;
        return str.substring(0, maxWidth - 3) + "...";
    }

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
