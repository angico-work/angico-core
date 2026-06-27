package com.angico.missoes;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MissaoRepository extends JpaRepository<Missao, Long> {
}
