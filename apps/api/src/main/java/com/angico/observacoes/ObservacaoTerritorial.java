package com.angico.observacoes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(
        name = "uk_observacao_workspace_client_mutation",
        columnNames = {"workspaceId", "clientMutationId"}
))
public class ObservacaoTerritorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    private String territorioId;

    @Column(nullable = false)
    private String categoria;

    @Column(nullable = false)
    private String titulo;

    @Column(length = 2000)
    private String descricao;

    private String localizacao;
    private String bairro;
    private String cidade;
    private String estado;
    private Double latitude;
    private Double longitude;

    @Column(nullable = false)
    private String urgencia;

    @Column(nullable = false)
    private String status;

    private String autorId;

    @Column(length = 128)
    private String clientMutationId;

    private Instant occurredAt;

    @Column(length = 128)
    private String deviceId;

    @Column(nullable = false)
    private Instant createdAt;

    protected ObservacaoTerritorial() {
    }

    public ObservacaoTerritorial(
            String workspaceId,
            String territorioId,
            String categoria,
            String titulo,
            String descricao,
            String localizacao,
            Double latitude,
            Double longitude,
            String urgencia,
            String status,
            String autorId,
            Instant createdAt
    ) {
        this(
                workspaceId,
                territorioId,
                categoria,
                titulo,
                descricao,
                localizacao,
                latitude,
                longitude,
                urgencia,
                status,
                autorId,
                null,
                createdAt,
                null,
                createdAt
        );
    }

    public ObservacaoTerritorial(
            String workspaceId,
            String territorioId,
            String categoria,
            String titulo,
            String descricao,
            String localizacao,
            Double latitude,
            Double longitude,
            String urgencia,
            String status,
            String autorId,
            String clientMutationId,
            Instant occurredAt,
            String deviceId,
            Instant createdAt
    ) {
        this.workspaceId = workspaceId;
        this.territorioId = territorioId;
        this.categoria = categoria;
        this.titulo = titulo;
        this.descricao = descricao;
        this.localizacao = localizacao;
        this.latitude = latitude;
        this.longitude = longitude;
        this.urgencia = urgencia;
        this.status = status;
        this.autorId = autorId;
        this.clientMutationId = clientMutationId;
        this.occurredAt = occurredAt;
        this.deviceId = deviceId;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public String getTerritorioId() {
        return territorioId;
    }

    public String getCategoria() {
        return categoria;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getLocalizacao() {
        return localizacao;
    }

    public String getBairro() {
        return bairro;
    }

    public void setBairro(String bairro) {
        this.bairro = bairro;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getUrgencia() {
        return urgencia;
    }

    public String getStatus() {
        return status;
    }

    public String getAutorId() {
        return autorId;
    }

    public String getClientMutationId() {
        return clientMutationId;
    }

    public Instant getOccurredAt() {
        return occurredAt == null ? createdAt : occurredAt;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
