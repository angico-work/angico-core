package com.angico.recursos;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecursoRepository extends JpaRepository<Recurso, Long> {
    List<Recurso> findByWorkspaceIdOrderByNomeAsc(String workspaceId);
}
