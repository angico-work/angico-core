package com.angico.acoes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

/**
 * Uma ação concreta executada como parte de uma missão. É o passo de execução
 * do fluxo territorial: o que foi efetivamente feito, por quem e em que estado.
 */
@Entity
public class Acao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String workspaceId;
    private Long territorioId;
    private Long missaoId;
    private String titulo;
    private String descricao;
    private String status;
    private String responsavelId;
    private String resultadoDescricao;
    private Double latitude;
    private Double longitude;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant concluidaAt;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String titulo;

    @Column(length = 2000)
    private String descricao;

    @Column(nullable = false)
    private String status;

    private String missaoId;

    private String responsavelId;

    @Column(nullable = false)
    private Instant createdAt;

    protected Acao() {
    }

    public Acao(
            String workspaceId,
            String titulo,
            String descricao,
            String status,
            String missaoId,
            String responsavelId,
            Instant createdAt
    ) {
        this.workspaceId = workspaceId;
        this.titulo = titulo;
        this.descricao = descricao;
        this.status = status;
        this.missaoId = missaoId;
        this.responsavelId = responsavelId;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getStatus() {
        return status;
    }

    public String getMissaoId() {
        return missaoId;
    }

    public String getResponsavelId() {
        return responsavelId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public Long getTerritorioId() {
        return territorioId;
    }

    public void setTerritorioId(Long territorioId) {
        this.territorioId = territorioId;
    }

    public Long getMissaoId() {
        return missaoId;
    }

    public void setMissaoId(Long missaoId) {
        this.missaoId = missaoId;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getResponsavelId() {
        return responsavelId;
    }

    public void setResponsavelId(String responsavelId) {
        this.responsavelId = responsavelId;
    }

    public String getResultadoDescricao() {
        return resultadoDescricao;
    }

    public void setResultadoDescricao(String resultadoDescricao) {
        this.resultadoDescricao = resultadoDescricao;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getConcluidaAt() {
        return concluidaAt;
    }

    public void setConcluidaAt(Instant concluidaAt) {
        this.concluidaAt = concluidaAt;
    }
}
