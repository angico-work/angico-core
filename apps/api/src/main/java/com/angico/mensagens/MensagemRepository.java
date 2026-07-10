package com.angico.mensagens;

import java.util.List;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MensagemRepository extends JpaRepository<Mensagem, Long> {
    @Query("""
            select m from Mensagem m
            where m.conversaId = :conversaId
            order by coalesce(m.occurredAt, m.createdAt),
                     coalesce(m.recordedAt, m.createdAt),
                     m.id
            """)
    List<Mensagem> findTimeline(@Param("conversaId") Long conversaId);

    List<Mensagem> findTop8ByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    Optional<Mensagem> findTopByConversaIdOrderByRecordedAtDescIdDesc(Long conversaId);

    Optional<Mensagem> findByWorkspaceIdAndSenderPessoaIdAndClientMessageId(
            String workspaceId,
            Long senderPessoaId,
            String clientMessageId
    );

    @Query("""
            select count(m) from Mensagem m
            where m.conversaId = :conversaId
              and m.senderPessoaId <> :pessoaId
              and (m.recordedAt > :readThrough
                   or (m.recordedAt = :readThrough and m.id > :lastReadMessageId))
            """)
    long countUnreadAfter(
            @Param("conversaId") Long conversaId,
            @Param("pessoaId") Long pessoaId,
            @Param("readThrough") Instant readThrough,
            @Param("lastReadMessageId") Long lastReadMessageId
    );

    long countByConversaIdAndSenderPessoaIdNot(Long conversaId, Long senderPessoaId);

    long countByWorkspaceId(String workspaceId);
}
