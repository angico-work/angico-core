package com.angico.acoes;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

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
