package com.ilhankazan.social.mapper;

import com.ilhankazan.social.dto.interaction.CommentResponse;
import com.ilhankazan.social.entity.Interaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {AccountMapper.class})
public interface InteractionMapper {

    @Mapping(target = "author", source = "account", qualifiedByName = "noFollow")
    CommentResponse toCommentResponse(Interaction interaction);
}