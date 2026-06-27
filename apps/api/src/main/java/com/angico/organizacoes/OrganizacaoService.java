package com.angico.organizacoes;

import org.springframework.stereotype.Service;

@Service
public class OrganizacaoService {

    private final OrganizacaoRepository organizacaoRepository;
    private final ParticipacaoRepository participacaoRepository;

    public OrganizacaoService(OrganizacaoRepository organizacaoRepository, ParticipacaoRepository participacaoRepository) {
        this.organizacaoRepository = organizacaoRepository;
        this.participacaoRepository = participacaoRepository;
    }
}
