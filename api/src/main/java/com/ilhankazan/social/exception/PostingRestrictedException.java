package com.ilhankazan.social.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class PostingRestrictedException extends RuntimeException {

    public PostingRestrictedException(String message) {
        super(message);
    }
}
