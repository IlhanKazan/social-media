package com.ilhankazan.social.event;

import com.ilhankazan.social.dto.message.MessageResponse;

public record MessageCreatedEvent(
    MessageResponse message,
    String participantAUsername,
    String participantBUsername
) {}
