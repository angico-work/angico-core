package com.angico.mensagens;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversaRepository extends JpaRepository<Conversa, Long> {
    List<Conversa> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);

    List<Conversa> findByTerritorioIdOrderByUpdatedAtDesc(Long territorioId);
}
