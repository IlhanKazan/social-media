package com.ilhankazan.social.service.moderation;

import java.util.List;

public interface ContentModerator {
    ModerationResult moderate(String text, List<String> imageUrls);
}
