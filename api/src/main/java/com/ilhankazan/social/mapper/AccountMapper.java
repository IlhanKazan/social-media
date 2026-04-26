package com.ilhankazan.social.mapper;

import com.ilhankazan.social.dto.account.MyAccountResponse;
import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.auth.AuthResponse;
import com.ilhankazan.social.entity.Account;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AccountMapper {
    
    @Mapping(target = "role", source = "role.name")
    AuthResponse.AccountSummary toSummary(Account account);

    @Mapping(target = "role", source = "role.name")
    @Mapping(target = "joinedAt", source = "createdAt")
    MyAccountResponse toMyResponse(Account account);

    @Mapping(target = "joinedAt", source = "createdAt")
    @Mapping(target = "followerCount", constant = "0L")
    @Mapping(target = "followingCount", constant = "0L")
    @Mapping(target = "isFollowing", constant = "false")
    PublicAccountResponse toPublicResponse(Account account);
}
