package com.angico.impacto;

import org.springframework.stereotype.Service;

@Service
public class ImpactoService {

    private final IndicadorRepository indicadorRepository;
    private final MedicaoRepository medicaoRepository;
    private final ResultadoRepository resultadoRepository;
    private final MedicaoMemoryPublisher medicaoMemoryPublisher;

    public ImpactoService(IndicadorRepository indicadorRepository, MedicaoRepository medicaoRepository, ResultadoRepository resultadoRepository, MedicaoMemoryPublisher medicaoMemoryPublisher) {
        this.indicadorRepository = indicadorRepository;
        this.medicaoRepository = medicaoRepository;
        this.resultadoRepository = resultadoRepository;
        this.medicaoMemoryPublisher = medicaoMemoryPublisher;
    }
}
