package com.angico.common.idempotency;

import com.angico.common.ClockProvider;
import com.angico.common.ConflictException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.TreeSet;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class IdempotencyService {

    private static final Pattern SAFE_KEY = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");

    private final IdempotencyRecordRepository repository;
    private final ObjectMapper objectMapper;
    private final ClockProvider clock;

    public IdempotencyService(
            IdempotencyRecordRepository repository,
            ObjectMapper objectMapper,
            ClockProvider clock
    ) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public String normalizeKey(String rawKey) {
        if (rawKey == null) {
            return null;
        }
        if (!rawKey.equals(rawKey.strip()) || !SAFE_KEY.matcher(rawKey).matches()) {
            throw new IllegalArgumentException("Idempotency-Key inválido.");
        }
        return rawKey;
    }

    public String canonicalPayloadHash(Object payload) {
        try {
            JsonNode sorted = sort(objectMapper.valueToTree(payload));
            byte[] canonical = objectMapper.writeValueAsBytes(sorted);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(canonical));
        } catch (JacksonException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Não foi possível calcular a identidade da requisição.", exception);
        }
    }

    public Optional<IdempotencyRecord> find(
            String workspaceId,
            String actorId,
            IdempotencyOperation operation,
            String key
    ) {
        return repository.findByWorkspaceIdAndActorIdAndOperationKindAndIdempotencyKey(
                workspaceId, actorId, operation.name(), key);
    }

    public IdempotencyRecord reserve(
            String workspaceId,
            String actorId,
            IdempotencyOperation operation,
            String key,
            String requestHash
    ) {
        return repository.saveAndFlush(new IdempotencyRecord(
                workspaceId, actorId, operation, key, requestHash, clock.now()));
    }

    public void validateReplay(IdempotencyRecord record, String requestHash) {
        if (!MessageDigest.isEqual(
                record.getRequestHash().getBytes(StandardCharsets.US_ASCII),
                requestHash.getBytes(StandardCharsets.US_ASCII))) {
            throw new ConflictException("Idempotency-Key já foi usado com outro payload.");
        }
        if (record.getCompletedAt() == null || record.getResourceId() == null) {
            throw new ConflictException("A requisição idempotente ainda não foi concluída.");
        }
    }

    private JsonNode sort(JsonNode node) {
        if (node.isObject()) {
            ObjectNode sorted = objectMapper.createObjectNode();
            var fieldNames = new TreeSet<String>();
            fieldNames.addAll(node.propertyNames());
            fieldNames.forEach(fieldName -> sorted.set(fieldName, sort(node.get(fieldName))));
            return sorted;
        }
        if (node.isArray()) {
            ArrayNode sorted = objectMapper.createArrayNode();
            node.forEach(child -> sorted.add(sort(child)));
            return sorted;
        }
        return node;
    }
}
