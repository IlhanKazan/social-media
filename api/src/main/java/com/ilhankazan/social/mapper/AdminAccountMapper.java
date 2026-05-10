package com.ilhankazan.social.mapper;

import com.ilhankazan.social.dto.admin.AdminAccountResponse;
import com.ilhankazan.social.entity.Account;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;

@Mapper(componentModel = "spring")
public interface AdminAccountMapper {

    @Mapping(target = "role", source = "account.role.name")
    @Mapping(target = "lastLoginAt", source = "lastLogin")
    @Mapping(target = "postCount", source = "postCount")
    AdminAccountResponse toResponse(Account account, Instant lastLogin, long postCount);
}
