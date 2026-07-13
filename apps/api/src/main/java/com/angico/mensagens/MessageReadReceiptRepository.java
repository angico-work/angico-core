package com.angico.mensagens;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageReadReceiptRepository extends JpaRepository<MessageReadReceipt, Long> {
    Optional<MessageReadReceipt> findByWorkspaceIdAndConversaIdAndPessoaId(
            String workspaceId,
            Long conversaId,
            Long pessoaId
    );
}
