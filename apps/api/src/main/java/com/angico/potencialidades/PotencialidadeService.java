package com.angico.potencialidades;

import org.springframework.stereotype.Service;

@Service
public class PotencialidadeService {

    private final PotencialidadeRepository potencialidadeRepository;
    private final PotencialidadeMemoryPublisher potencialidadeMemoryPublisher;

    public PotencialidadeService(PotencialidadeRepository potencialidadeRepository, PotencialidadeMemoryPublisher potencialidadeMemoryPublisher) {
        this.potencialidadeRepository = potencialidadeRepository;
        this.potencialidadeMemoryPublisher = potencialidadeMemoryPublisher;
    }
}
