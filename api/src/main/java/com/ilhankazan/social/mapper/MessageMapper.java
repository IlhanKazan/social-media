package com.ilhankazan.social.mapper;

import com.ilhankazan.social.dto.message.MessageResponse;
import com.ilhankazan.social.entity.Message;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {AccountMapper.class})
public interface MessageMapper {

    @Mapping(target = "sender", source = "sender", qualifiedByName = "noFollow")
    MessageResponse toResponse(Message message);
}
