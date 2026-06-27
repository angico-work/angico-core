package com.angico.acoes;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AtribuicaoRepository extends JpaRepository<AtribuicaoResponsabilidade, Long> {
}
