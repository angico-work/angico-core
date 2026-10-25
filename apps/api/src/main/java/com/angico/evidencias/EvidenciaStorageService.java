package com.angico.evidencias;

import com.angico.common.upload.SafeUploadValidator;
import com.angico.common.upload.UploadStorage;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EvidenciaStorageService {

    private static final org.slf4j.Logger LOGGER = org.slf4j.LoggerFactory.getLogger(EvidenciaStorageService.class);
    private final UploadStorage storage;
    private final SafeUploadValidator validator;

    public EvidenciaStorageService(
            UploadStorage storage,
            SafeUploadValidator validator
    ) {
        this.storage = storage;
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
        String target = storage.store("evidencias/" + sha256.substring(0, 2), extension,
                prepared.bytes(), prepared.contentType());
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
        return storage.resource(evidencia.getStoragePath());
    }

    public void delete(StoredEvidence stored) {
        if (stored == null) {
            return;
        }
        try {
            storage.delete(stored.path());
        } catch (RuntimeException exception) {
            LOGGER.warn("Não foi possível remover um arquivo de evidência após rollback.");
        }
    }

    public record StoredEvidence(
            String originalFilename,
            String contentType,
            Long sizeBytes,
            String sha256,
            String path
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
