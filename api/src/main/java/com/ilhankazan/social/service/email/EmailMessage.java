package com.ilhankazan.social.service.email;

import java.util.Map;

public record EmailMessage(
    String to,
    String subject,
    String template,
    Map<String, String> templateParams
) {}
