package com.angico.territorios;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TerritorioRepository extends JpaRepository<Territorio, Long> {
}
