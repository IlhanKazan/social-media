package com.ilhankazan.social.event;

import com.ilhankazan.social.entity.Account;

public record UserRegisteredEvent(Account account) {}
