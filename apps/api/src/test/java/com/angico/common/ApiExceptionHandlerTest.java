package com.angico.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

class ApiExceptionHandlerTest {

    @Test
    void invalidQueryParameterIsABadRequest() {
        MethodArgumentTypeMismatchException exception = new MethodArgumentTypeMismatchException(
                "not-an-instant",
                Instant.class,
                "from",
                mock(MethodParameter.class),
                new IllegalArgumentException("invalid instant")
        );

        ProblemDetail response = new ApiExceptionHandler().handleTypeMismatch(exception);

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
    }
}
