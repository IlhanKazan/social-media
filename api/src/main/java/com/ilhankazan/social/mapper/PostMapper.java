package com.ilhankazan.social.mapper;

import com.ilhankazan.social.dto.interaction.InteractionCounts;
import com.ilhankazan.social.dto.interaction.UserInteractions;
import com.ilhankazan.social.dto.post.PostResponse;
import com.ilhankazan.social.entity.Post;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {AccountMapper.class})
public interface PostMapper {

    @Mapping(target = "author", source = "post.account", qualifiedByName = "noFollow")
    @Mapping(target = "parentPostId", source = "post.parentPost.id")
    @Mapping(target = "likeCount", source = "counts.likes")
    @Mapping(target = "dislikeCount", source = "counts.dislikes")
    @Mapping(target = "commentCount", source = "counts.comments")
    @Mapping(target = "likedByMe", source = "userInteractions.liked")
    @Mapping(target = "dislikedByMe", source = "userInteractions.disliked")
    PostResponse toResponse(Post post, InteractionCounts counts, UserInteractions userInteractions);
}