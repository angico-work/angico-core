package com.angico.observacoes;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ObservacaoRepository extends JpaRepository<ObservacaoTerritorial, Long> {
}
