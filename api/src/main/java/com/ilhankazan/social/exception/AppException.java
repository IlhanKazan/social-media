package com.ilhankazan.social.exception;

import org.springframework.http.HttpStatus;
import lombok.Getter;

@Getter
public class AppException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public AppException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
