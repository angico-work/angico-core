package com.angico.mensagens;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MensagemRepository extends JpaRepository<Mensagem, Long> {
    List<Mensagem> findByConversaIdOrderByCreatedAtAsc(Long conversaId);

    List<Mensagem> findTop8ByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    long countByWorkspaceId(String workspaceId);
}
