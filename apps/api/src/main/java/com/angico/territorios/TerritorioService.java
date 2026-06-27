package com.angico.territorios;

import org.springframework.stereotype.Service;

@Service
public class TerritorioService {

    private final TerritorioRepository territorioRepository;
    private final TerritorioMemoryPublisher territorioMemoryPublisher;

    public TerritorioService(TerritorioRepository territorioRepository, TerritorioMemoryPublisher territorioMemoryPublisher) {
        this.territorioRepository = territorioRepository;
        this.territorioMemoryPublisher = territorioMemoryPublisher;
    }
}
