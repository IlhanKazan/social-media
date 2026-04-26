package com.ilhankazan.social.dto.search;

import com.ilhankazan.social.dto.account.PublicAccountResponse;
import com.ilhankazan.social.dto.post.PostResponse;
import java.util.List;

public record CombinedSearchResponse(
    List<PublicAccountResponse> users,
    List<PostResponse> posts
) {}
