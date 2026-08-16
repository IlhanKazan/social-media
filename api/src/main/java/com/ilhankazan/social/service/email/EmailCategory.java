package com.ilhankazan.social.service.email;

/**
 * Whether a message can be unsubscribed from.
 *
 * The distinction is legal as much as technical: transactional mail is sent
 * because the recipient asked for something (a reset link, a login code) and
 * suppressing it would lock them out, so it carries no opt-out and needs none.
 * Notification mail is sent because we decided it might interest them, so it
 * carries a working one-click unsubscribe and honours the account's preferences
 * before it is ever queued.
 */
public enum EmailCategory {
    TRANSACTIONAL,
    NOTIFICATION;

    public boolean isUnsubscribable() {
        return this == NOTIFICATION;
    }
}
