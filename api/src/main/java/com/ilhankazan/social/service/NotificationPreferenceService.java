package com.ilhankazan.social.service;

import com.ilhankazan.social.dto.notification.NotificationPreferenceRequest;
import com.ilhankazan.social.entity.NotificationPreference;
import com.ilhankazan.social.entity.NotificationType;
import com.ilhankazan.social.repository.NotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private final NotificationPreferenceRepository preferenceRepository;

    // Absent row = everything enabled. The default is transient (not persisted on read).
    @Transactional(readOnly = true)
    public NotificationPreference getOrDefault(Long accountId) {
        return preferenceRepository.findByAccountId(accountId).orElseGet(() -> {
            NotificationPreference defaults = new NotificationPreference();
            defaults.setAccountId(accountId);
            return defaults;
        });
    }

    @Transactional
    public NotificationPreference update(Long accountId, NotificationPreferenceRequest req) {
        NotificationPreference pref = preferenceRepository.findByAccountId(accountId)
            .orElseGet(() -> {
                NotificationPreference created = new NotificationPreference();
                created.setAccountId(accountId);
                return created;
            });
        pref.setLikes(req.likes());
        pref.setReposts(req.reposts());
        pref.setFollows(req.follows());
        pref.setReplies(req.replies());
        pref.setMentions(req.mentions());
        pref.setRecommendations(req.recommendations());
        return preferenceRepository.save(pref);
    }

    @Transactional(readOnly = true)
    public boolean isPushEnabled(Long accountId, NotificationType type) {
        NotificationPreference pref = getOrDefault(accountId);
        return switch (type) {
            case LIKE -> pref.isLikes();
            case REPOST, QUOTE_REPOST -> pref.isReposts();
            case FOLLOW -> pref.isFollows();
            case REPLY -> pref.isReplies();
            case MENTION -> pref.isMentions();
            case RECOMMENDATION -> pref.isRecommendations();
            default -> true;
        };
    }
}
