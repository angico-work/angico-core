package com.angico.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

public class AllowedOccurrenceTimeValidator implements ConstraintValidator<AllowedOccurrenceTime, Instant> {

    private static final Instant EARLIEST_ALLOWED = Instant.parse("2000-01-01T00:00:00Z");

    @Override
    public boolean isValid(Instant value, ConstraintValidatorContext context) {
        return value == null
                || (!value.isBefore(EARLIEST_ALLOWED)
                && !value.isAfter(Instant.now().plus(5, ChronoUnit.MINUTES)));
    }
}
