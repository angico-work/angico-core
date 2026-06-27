package com.angico.pessoas;

import java.util.Locale;
import java.util.regex.Pattern;

public final class AngicoIdNormalizer {

    private static final Pattern ANGICO_ID_PATTERN = Pattern.compile("^[a-z0-9._]{3,30}$");

    private AngicoIdNormalizer() {
    }

    public static String normalize(String rawAngicoId) {
        String value = rawAngicoId == null
                ? ""
                : rawAngicoId.trim().replaceFirst("^@", "").toLowerCase(Locale.ROOT);
        if (!ANGICO_ID_PATTERN.matcher(value).matches()) {
            throw new IllegalArgumentException("Use 3 a 30 caracteres: letras, numeros, ponto ou underline.");
        }
        return value;
    }

    public static String normalizeOptional(String rawAngicoId) {
        if (rawAngicoId == null || rawAngicoId.isBlank()) {
            return null;
        }
        return normalize(rawAngicoId);
    }
}
