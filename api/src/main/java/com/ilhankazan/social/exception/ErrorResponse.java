package com.ilhankazan.social.exception;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
    String code,
    String message,
    Instant timestamp,
    String path,
    Map<String, String> fieldErrors
) {}
