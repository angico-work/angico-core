package com.angico.potencialidades;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PotencialidadeRepository extends JpaRepository<PotencialidadeTerritorial, Long> {
}
