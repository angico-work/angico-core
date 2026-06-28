package com.angico.missoes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

/**
 * Uma missão: uma frente de ação que o território assume para responder a um
 * problema priorizado. Carrega progresso e pode ser liderada por alguém.
 */
@Entity
public class Missao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String workspaceId;
    private Long territorioId;
    private Long problemaId;
    private String titulo;
    private String descricao;
    private String status;
    private String prioridade;
    private Integer progresso;
    private Double latitude;
    private Double longitude;
    private String organizacaoId;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant iniciadaAt;
    private Instant concluidaAt;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String titulo;

    @Column(length = 2000)
    private String descricao;

    @Column(nullable = false)
    private String status;

    private int progresso;

    private String problemaId;

    private String responsavelId;

    @Column(nullable = false)
    private Instant createdAt;

    protected Missao() {
    }

    public Missao(
            String workspaceId,
            String titulo,
            String descricao,
            String status,
            int progresso,
            String problemaId,
            String responsavelId,
            Instant createdAt
    ) {
        this.workspaceId = workspaceId;
        this.titulo = titulo;
        this.descricao = descricao;
        this.status = status;
        this.progresso = progresso;
        this.problemaId = problemaId;
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

    public int getProgresso() {
        return progresso;
    }

    public String getProblemaId() {
        return problemaId;
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

    public Long getProblemaId() {
        return problemaId;
    }

    public void setProblemaId(Long problemaId) {
        this.problemaId = problemaId;
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

    public String getPrioridade() {
        return prioridade;
    }

    public void setPrioridade(String prioridade) {
        this.prioridade = prioridade;
    }

    public Integer getProgresso() {
        return progresso;
    }

    public void setProgresso(Integer progresso) {
        this.progresso = progresso;
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

    public String getOrganizacaoId() {
        return organizacaoId;
    }

    public void setOrganizacaoId(String organizacaoId) {
        this.organizacaoId = organizacaoId;
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

    public Instant getIniciadaAt() {
        return iniciadaAt;
    }

    public void setIniciadaAt(Instant iniciadaAt) {
        this.iniciadaAt = iniciadaAt;
    }

    public Instant getConcluidaAt() {
        return concluidaAt;
    }

    public void setConcluidaAt(Instant concluidaAt) {
        this.concluidaAt = concluidaAt;
    }
}
