package com.angico.mensagens;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
        name = "message_read_receipt",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_message_read_receipt_conversation_person",
                columnNames = {"workspaceId", "conversaId", "pessoaId"}
        ),
        indexes = @Index(
                name = "idx_message_read_receipt_lookup",
                columnList = "workspaceId,conversaId,pessoaId"
        )
)
public class MessageReadReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private Long conversaId;

    @Column(nullable = false)
    private Long pessoaId;

    private Long lastReadMessageId;

    @Column(nullable = false)
    private Instant readThrough;

    @Column(nullable = false)
    private Instant updatedAt;

    protected MessageReadReceipt() {
    }

    public MessageReadReceipt(
            String workspaceId,
            Long conversaId,
            Long pessoaId,
            Long lastReadMessageId,
            Instant readThrough,
            Instant updatedAt
    ) {
        this.workspaceId = workspaceId;
        this.conversaId = conversaId;
        this.pessoaId = pessoaId;
        this.lastReadMessageId = lastReadMessageId;
        this.readThrough = readThrough;
        this.updatedAt = updatedAt;
    }

    public Instant getReadThrough() {
        return readThrough;
    }

    public Long getLastReadMessageId() {
        return lastReadMessageId;
    }

    public void advance(Long messageId, Instant through, Instant updatedAt) {
        if (through.isBefore(readThrough)) {
            return;
        }
        this.lastReadMessageId = messageId;
        this.readThrough = through;
        this.updatedAt = updatedAt;
    }
}
