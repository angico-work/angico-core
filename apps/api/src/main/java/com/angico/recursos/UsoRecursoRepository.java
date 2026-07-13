package com.angico.recursos;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsoRecursoRepository extends JpaRepository<UsoRecurso, Long> {
    List<UsoRecurso> findByWorkspaceIdAndRecursoIdOrderByOccurredAtDesc(
            String workspaceId, Long recursoId);
}
