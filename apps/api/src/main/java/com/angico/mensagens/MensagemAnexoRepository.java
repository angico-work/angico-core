package com.angico.mensagens;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MensagemAnexoRepository extends JpaRepository<MensagemAnexo, Long> {
    List<MensagemAnexo> findByMensagemIdOrderByCreatedAtAsc(Long mensagemId);

    List<MensagemAnexo> findByMensagemIdInOrderByCreatedAtAsc(List<Long> mensagemIds);
}
