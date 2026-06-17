package com.ilhankazan.social.dto.message;

import com.ilhankazan.social.dto.account.PublicAccountResponse;

public record SharedPostPreview(
    Long id,
    PublicAccountResponse author,
    String contentSnippet,
    String imageUrl
) {}
