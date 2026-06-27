package com.angico.organizacoes;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ParticipacaoRepository extends JpaRepository<Participacao, Long> {
}
