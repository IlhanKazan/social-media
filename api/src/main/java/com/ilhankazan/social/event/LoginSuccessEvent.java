package com.ilhankazan.social.event;

import com.ilhankazan.social.entity.Account;

public record LoginSuccessEvent(
    Account account,
    String ipAddress,
    String userAgent
) {}
