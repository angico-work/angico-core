package com.angico.pessoas;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class AngicoIdNormalizerTest {

    @Test
    void normalizesCaseSpacesAndLeadingAt() {
        assertEquals("campo.sp", AngicoIdNormalizer.normalize("  @Campo.SP  "));
    }

    @Test
    void rejectsInvalidCharacters() {
        assertThrows(IllegalArgumentException.class, () -> AngicoIdNormalizer.normalize("@campo sp"));
        assertThrows(IllegalArgumentException.class, () -> AngicoIdNormalizer.normalize("@ab"));
    }
}
