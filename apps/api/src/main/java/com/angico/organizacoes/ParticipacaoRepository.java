package com.angico.organizacoes;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipacaoRepository extends JpaRepository<Participacao, Long> {
    List<Participacao> findByWorkspaceIdAndOrganizationIdOrderByStartedAtDesc(
            String workspaceId, Long organizationId);

    Optional<Participacao> findByWorkspaceIdAndOrganizationIdAndPessoaIdAndStatus(
            String workspaceId, Long organizationId, Long pessoaId, String status);
}
