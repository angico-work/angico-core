package com.angico.mensagens;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

public record ConversaRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @Positive Long territorioId,
        @Size(max = 255) String contextEntityType,
        @Size(max = 255) String contextEntityId,
        @NotBlank @Size(max = 240) String titulo,
        @Size(max = 50) List<@NotNull @Positive Long> participanteIds,
        @Size(max = 50) List<@NotBlank @Size(max = 255) String> participanteRefs
) {

    @AssertTrue(message = "a conversa aceita no máximo 50 participantes")
    public boolean isParticipantCountValid() {
        long ids = participanteIds == null ? 0 : participanteIds.size();
        long refs = participanteRefs == null ? 0 : participanteRefs.stream()
                .filter(Objects::nonNull)
                .flatMap(ref -> Arrays.stream(ref.split("[,;\\s]+")))
                .filter(ref -> !ref.isBlank())
                .count();
        return ids + refs <= 50;
    }
}
