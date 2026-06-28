package com.angico.problemas;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

/**
 * Um problema socioambiental: o que a comunidade reconhece como uma questão a
 * ser enfrentada no território. Costuma nascer a partir de uma ou mais
 * observações e segue o fluxo compreender → priorizar → agir → medir.
 */
@Entity
public class ProblemaSocioambiental {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String workspaceId;
    private Long territorioId;
    private Long observacaoId;
    private String titulo;
    private String descricao;
    private String categoria;
    private String status;
    private String prioridade;
    private Integer severidade;
    private Double latitude;
    private Double longitude;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant priorizadoAt;

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
    private Double latitude;
    private Double longitude;

    @Column(nullable = false)
    private String severidade;

    @Column(nullable = false)
    private String status;

    private String origemObservacaoId;
    private String autorId;

    @Column(nullable = false)
    private Instant createdAt;

    protected ProblemaSocioambiental() {
    }

    public ProblemaSocioambiental(
            String workspaceId,
            String territorioId,
            String categoria,
            String titulo,
            String descricao,
            String localizacao,
            Double latitude,
            Double longitude,
            String severidade,
            String status,
            String origemObservacaoId,
            String autorId,
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
        this.severidade = severidade;
        this.status = status;
        this.origemObservacaoId = origemObservacaoId;
        this.autorId = autorId;
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

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getSeveridade() {
        return severidade;
    }

    public String getStatus() {
        return status;
    }

    public String getOrigemObservacaoId() {
        return origemObservacaoId;
    }

    public String getAutorId() {
        return autorId;
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

    public Long getObservacaoId() {
        return observacaoId;
    }

    public void setObservacaoId(Long observacaoId) {
        this.observacaoId = observacaoId;
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

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
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

    public Integer getSeveridade() {
        return severidade;
    }

    public void setSeveridade(Integer severidade) {
        this.severidade = severidade;
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

    public Instant getPriorizadoAt() {
        return priorizadoAt;
    }

    public void setPriorizadoAt(Instant priorizadoAt) {
        this.priorizadoAt = priorizadoAt;
    }
}
