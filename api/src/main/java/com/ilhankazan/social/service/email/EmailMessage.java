package com.ilhankazan.social.service.email;

import java.util.Map;

/**
 * One queued email.
 *
 * @param to             recipient address
 * @param subject        ignored when the template supplies a localised one; kept
 *                       so a caller can still override for ad-hoc mail
 * @param template       key into {@link EmailCopy}
 * @param templateParams placeholder values, e.g. {@code name}, {@code resetLink}
 * @param language       recipient's language; falls back to Turkish when unknown
 * @param category       decides whether the message carries an opt-out
 * @param accountId      recipient account, needed to sign an unsubscribe link;
 *                       null for mail not tied to an account
 */
public record EmailMessage(
    String to,
    String subject,
    String template,
    Map<String, String> templateParams,
    String language,
    EmailCategory category,
    Long accountId
) {
    /**
     * Transactional mail: no opt-out, because suppressing it would lock the
     * recipient out of their own account.
     */
    public static EmailMessage transactional(String to, String subject, String template,
                                             Map<String, String> params, String language) {
        return new EmailMessage(to, subject, template, params, language, EmailCategory.TRANSACTIONAL, null);
    }

    /** Mail the recipient can turn off; requires an account to sign the opt-out link. */
    public static EmailMessage notification(String to, String subject, String template,
                                            Map<String, String> params, String language, Long accountId) {
        return new EmailMessage(to, subject, template, params, language, EmailCategory.NOTIFICATION, accountId);
    }
}
