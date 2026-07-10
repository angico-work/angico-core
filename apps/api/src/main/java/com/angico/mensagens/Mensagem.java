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
        uniqueConstraints = @UniqueConstraint(
                name = "uk_mensagem_workspace_client_message",
                columnNames = {"workspaceId", "senderPessoaId", "clientMessageId"}
        ),
        indexes = @Index(
                name = "idx_mensagem_conversation_occurred",
                columnList = "conversaId,occurredAt,id"
        )
)
public class Mensagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String workspaceId;
    private Long conversaId;
    private Long senderPessoaId;
    private String senderNome;
    @Column(length = 4000)
    private String corpo;
    private Double latitude;
    private Double longitude;
    @Column(length = 500)
    private String localDescricao;
    private String linkedEntityType;
    private String linkedEntityId;
    @Column(length = 128)
    private String clientMessageId;
    @Column(length = 128)
    private String deviceId;
    private String status;
    private Instant occurredAt;
    private Instant recordedAt;
    private Instant createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public Long getConversaId() {
        return conversaId;
    }

    public void setConversaId(Long conversaId) {
        this.conversaId = conversaId;
    }

    public Long getSenderPessoaId() {
        return senderPessoaId;
    }

    public void setSenderPessoaId(Long senderPessoaId) {
        this.senderPessoaId = senderPessoaId;
    }

    public String getSenderNome() {
        return senderNome;
    }

    public void setSenderNome(String senderNome) {
        this.senderNome = senderNome;
    }

    public String getCorpo() {
        return corpo;
    }

    public void setCorpo(String corpo) {
        this.corpo = corpo;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getLocalDescricao() {
        return localDescricao;
    }

    public void setLocalDescricao(String localDescricao) {
        this.localDescricao = localDescricao;
    }

    public String getLinkedEntityType() {
        return linkedEntityType;
    }

    public void setLinkedEntityType(String linkedEntityType) {
        this.linkedEntityType = linkedEntityType;
    }

    public String getLinkedEntityId() {
        return linkedEntityId;
    }

    public void setLinkedEntityId(String linkedEntityId) {
        this.linkedEntityId = linkedEntityId;
    }

    public String getClientMessageId() {
        return clientMessageId;
    }

    public void setClientMessageId(String clientMessageId) {
        this.clientMessageId = clientMessageId;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getOccurredAt() {
        return occurredAt == null ? createdAt : occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }

    public Instant getRecordedAt() {
        return recordedAt == null ? createdAt : recordedAt;
    }

    public void setRecordedAt(Instant recordedAt) {
        this.recordedAt = recordedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
