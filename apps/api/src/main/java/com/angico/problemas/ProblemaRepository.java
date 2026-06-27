package com.angico.problemas;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProblemaRepository extends JpaRepository<ProblemaSocioambiental, Long> {
}
