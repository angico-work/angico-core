package com.angico.mensagens;

import com.angico.common.validation.CoordinatePair;
import com.angico.common.validation.AllowedOccurrenceTime;
import com.angico.common.validation.ValidCoordinatePair;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

@ValidCoordinatePair
public record MensagemRequest(
        @Size(max = 4000) String corpo,
        Double latitude,
        Double longitude,
        @Size(max = 500) String localDescricao,
        @Size(max = 255) String linkedEntityType,
        @Size(max = 255) String linkedEntityId,
        @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}") String clientMessageId,
        @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}") String deviceId,
        @AllowedOccurrenceTime Instant occurredAt,
        @Size(max = 8) List<MultipartFile> attachments
) implements CoordinatePair {
}
