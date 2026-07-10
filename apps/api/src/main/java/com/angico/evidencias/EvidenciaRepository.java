package com.angico.evidencias;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EvidenciaRepository extends JpaRepository<Evidencia, Long> {
    List<Evidencia> findByWorkspaceIdOrderByRecordedAtDesc(String workspaceId);

    List<Evidencia> findByWorkspaceIdAndSubjectTypeAndSubjectIdOrderByRecordedAtDesc(
            String workspaceId, String subjectType, Long subjectId);
}
