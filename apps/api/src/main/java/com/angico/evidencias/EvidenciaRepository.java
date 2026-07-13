package com.angico.evidencias;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EvidenciaRepository extends JpaRepository<Evidencia, Long> {
    List<Evidencia> findByWorkspaceIdOrderByRecordedAtDesc(String workspaceId);

    List<Evidencia> findByWorkspaceIdAndSubjectTypeAndSubjectIdOrderByRecordedAtDesc(
            String workspaceId, String subjectType, Long subjectId);

    Optional<Evidencia> findByIdAndWorkspaceId(Long id, String workspaceId);

    Optional<Evidencia> findByWorkspaceIdAndClientMutationId(
            String workspaceId, String clientMutationId);
}
