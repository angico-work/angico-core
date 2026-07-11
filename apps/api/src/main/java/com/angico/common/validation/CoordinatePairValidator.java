package com.angico.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CoordinatePairValidator implements ConstraintValidator<ValidCoordinatePair, CoordinatePair> {

    @Override
    public boolean isValid(CoordinatePair value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        Double latitude = value.latitude();
        Double longitude = value.longitude();
        if (latitude == null || longitude == null) {
            return latitude == null && longitude == null;
        }
        return Double.isFinite(latitude)
                && Double.isFinite(longitude)
                && latitude >= -90
                && latitude <= 90
                && longitude >= -180
                && longitude <= 180;
    }
}
