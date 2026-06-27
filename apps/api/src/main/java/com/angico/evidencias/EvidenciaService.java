package com.angico.evidencias;

import org.springframework.stereotype.Service;

@Service
public class EvidenciaService {

    private final EvidenciaRepository evidenciaRepository;
    private final EvidenciaStorageService evidenciaStorageService;
    private final EvidenciaMemoryPublisher evidenciaMemoryPublisher;

    public EvidenciaService(EvidenciaRepository evidenciaRepository, EvidenciaStorageService evidenciaStorageService, EvidenciaMemoryPublisher evidenciaMemoryPublisher) {
        this.evidenciaRepository = evidenciaRepository;
        this.evidenciaStorageService = evidenciaStorageService;
        this.evidenciaMemoryPublisher = evidenciaMemoryPublisher;
    }
}
