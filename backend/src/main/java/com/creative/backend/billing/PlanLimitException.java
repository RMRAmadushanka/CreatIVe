package com.creative.backend.billing;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Structured plan-limit failures for clients (code + human message). */
public class PlanLimitException extends ResponseStatusException {

    private final String code;

    public PlanLimitException(String code, String message) {
        super(HttpStatus.PAYMENT_REQUIRED, message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public static final String PROJECT_LIMIT = "PROJECT_LIMIT";
    public static final String PAGE_LIMIT = "PAGE_LIMIT";
    public static final String MEDIA_LIMIT = "MEDIA_LIMIT";
    public static final String COMPONENT_LIMIT = "COMPONENT_LIMIT";
    public static final String DOWNGRADE_OVER_LIMIT = "DOWNGRADE_OVER_LIMIT";
}
