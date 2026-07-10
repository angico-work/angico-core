package com.angico.evidencias;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.UUID;
import com.angico.common.upload.SafeUploadValidator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EvidenciaStorageService {

    private final Path uploadRoot;
    private final SafeUploadValidator validator;

    public EvidenciaStorageService(
            @Value("${angico.uploads.dir:uploads}") String uploadDir,
            SafeUploadValidator validator
    ) {
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
        this.validator = validator;
    }

    public PreparedEvidence prepare(MultipartFile file) {
        SafeUploadValidator.PreparedUpload prepared = validator.prepare(file);
        return new PreparedEvidence(
                prepared.originalFilename(),
                prepared.contentType(),
                prepared.sizeBytes(),
                prepared.sha256(),
                prepared.extension(),
                prepared.bytes()
        );
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
