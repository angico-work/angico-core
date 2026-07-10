package com.angico.evidencias;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EvidenciaStorageService {

    private static final Map<String, Set<String>> EXTENSIONS = Map.of(
            "image/jpeg", Set.of("jpg", "jpeg"),
            "image/png", Set.of("png"),
            "image/webp", Set.of("webp"),
            "application/pdf", Set.of("pdf"),
            "text/plain", Set.of("txt")
    );

    private final Path uploadRoot;
    private final long maxBytes;
    private final Set<String> allowedContentTypes;

    public EvidenciaStorageService(
            @Value("${angico.uploads.dir:uploads}") String uploadDir,
            @Value("${angico.uploads.max-bytes:2097152}") long maxBytes,
            @Value("${angico.uploads.allowed-content-types}") String allowedContentTypes
    ) {
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
        this.maxBytes = maxBytes;
        this.allowedContentTypes = Arrays.stream(allowedContentTypes.split(","))
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .filter(value -> !value.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    public PreparedEvidence prepare(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("O arquivo de evidência está vazio.");
        }
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("O arquivo de evidência excede o limite permitido.");
        }

        String filename = validateFilename(file.getOriginalFilename());
        String contentType = validateContentType(file.getContentType());
        String extension = extension(filename);
        if (!EXTENSIONS.getOrDefault(contentType, Set.of()).contains(extension)) {
            throw new IllegalArgumentException("A extensão do arquivo não corresponde ao tipo informado.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException exception) {
            throw new IllegalArgumentException("Não foi possível ler o arquivo de evidência.", exception);
        }
        if (bytes.length == 0 || bytes.length > maxBytes) {
            throw new IllegalArgumentException("O tamanho do arquivo de evidência é inválido.");
        }
        if (!matchesContent(contentType, bytes)) {
            throw new IllegalArgumentException("O conteúdo do arquivo não corresponde ao tipo informado.");
        }

        String sha256 = sha256(bytes);
        return new PreparedEvidence(
                filename, contentType, (long) bytes.length, sha256, extension, bytes);
    }

    public StoredEvidence store(PreparedEvidence prepared) {
        String extension = prepared.extension();
        String sha256 = prepared.sha256();
        Path directory = uploadRoot.resolve("evidencias").resolve(sha256.substring(0, 2)).normalize();
        Path target = directory.resolve(UUID.randomUUID() + "." + extension).normalize();
        if (!target.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("Caminho de armazenamento inválido.");
        }
        try {
            Files.createDirectories(directory);
            Files.write(target, prepared.bytes(), StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível armazenar o arquivo de evidência.", exception);
        }
        return new StoredEvidence(
                prepared.originalFilename(),
                prepared.contentType(),
                prepared.sizeBytes(),
                sha256,
                target
        );
    }

    public Resource resource(Evidencia evidencia) {
        if (evidencia.getStoragePath() == null) {
            throw new IllegalArgumentException("Esta evidência não possui arquivo.");
        }
        Path path = Path.of(evidencia.getStoragePath()).toAbsolutePath().normalize();
        if (!path.startsWith(uploadRoot)
                || Files.isSymbolicLink(path)
                || !Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalArgumentException("Arquivo de evidência não encontrado.");
        }
        return new FileSystemResource(path);
    }

    public void delete(StoredEvidence stored) {
        if (stored == null) {
            return;
        }
        try {
            Files.deleteIfExists(stored.path());
        } catch (IOException ignored) {
        }
    }

    private String validateFilename(String value) {
        if (value == null || value.isBlank() || value.length() > 180
                || value.contains("/") || value.contains("\\") || value.contains("..")
                || value.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Nome de arquivo inválido.");
        }
        return value.strip();
    }

    private String validateContentType(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Tipo de arquivo obrigatório.");
        }
        String canonical = value.split(";", 2)[0].strip().toLowerCase(Locale.ROOT);
        if (!allowedContentTypes.contains(canonical) || !EXTENSIONS.containsKey(canonical)) {
            throw new IllegalArgumentException("Tipo de arquivo não permitido.");
        }
        return canonical;
    }

    private String extension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 1 || dot == filename.length() - 1) {
            throw new IllegalArgumentException("Extensão de arquivo obrigatória.");
        }
        return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private boolean matchesContent(String contentType, byte[] bytes) {
        return switch (contentType) {
            case "image/jpeg" -> bytes.length >= 3
                    && unsigned(bytes[0]) == 0xff && unsigned(bytes[1]) == 0xd8 && unsigned(bytes[2]) == 0xff;
            case "image/png" -> startsWith(bytes, new byte[]{
                    (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
            case "image/webp" -> bytes.length >= 12
                    && startsWith(bytes, "RIFF".getBytes(StandardCharsets.US_ASCII))
                    && startsWith(Arrays.copyOfRange(bytes, 8, bytes.length),
                    "WEBP".getBytes(StandardCharsets.US_ASCII));
            case "application/pdf" -> startsWith(bytes, "%PDF-".getBytes(StandardCharsets.US_ASCII));
            case "text/plain" -> isUtf8Text(bytes);
            default -> false;
        };
    }

    private boolean startsWith(byte[] bytes, byte[] prefix) {
        if (bytes.length < prefix.length) {
            return false;
        }
        for (int index = 0; index < prefix.length; index++) {
            if (bytes[index] != prefix[index]) {
                return false;
            }
        }
        return true;
    }

    private boolean isUtf8Text(byte[] bytes) {
        for (byte value : bytes) {
            if (value == 0) {
                return false;
            }
        }
        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes));
            return true;
        } catch (CharacterCodingException exception) {
            return false;
        }
    }

    private int unsigned(byte value) {
        return value & 0xff;
    }

    private String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponível.", exception);
        }
    }

    public record StoredEvidence(
            String originalFilename,
            String contentType,
            Long sizeBytes,
            String sha256,
            Path path
    ) {
    }

    public record PreparedEvidence(
            String originalFilename,
            String contentType,
            Long sizeBytes,
            String sha256,
            String extension,
            byte[] bytes
    ) {
    }
}
