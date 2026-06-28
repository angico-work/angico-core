package com.angico.problemas;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProblemaRepository extends JpaRepository<ProblemaSocioambiental, Long> {
<<<<<<< HEAD

    List<ProblemaSocioambiental> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    long countByWorkspaceId(String workspaceId);
=======
    List<ProblemaSocioambiental> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
    List<ProblemaSocioambiental> findByTerritorioIdOrderByUpdatedAtDesc(Long territorioId);
    long countByTerritorioId(Long territorioId);
    long countByTerritorioIdAndStatusNot(Long territorioId, String status);
>>>>>>> origin
}
