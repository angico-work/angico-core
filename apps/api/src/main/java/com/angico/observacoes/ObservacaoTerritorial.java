package com.angico.observacoes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

/**
 * Uma observação territorial: o registro bruto que um jovem/morador faz do que
 * acontece no território. É o ponto de partida do fluxo
 * observar → registrar → compreender → priorizar → agir → medir.
 */
@Entity
public class ObservacaoTerritorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String workspaceId;
    private Long territorioId;
    private String titulo;
    private String descricao;
    private String categoria;
    private String tipo;
    private String status;
    private Integer severidade;
    private String localDescricao;
    private String cidade;
    private String bairro;
    private Double latitude;
    private Double longitude;
    private String evidenciaInicial;
    private String actorId;
    private Long problemaId;
    private Long potencialidadeId;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant validadaAt;
    private Instant rejeitadaAt;

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
    private String urgencia;

    @Column(nullable = false)
    private String status;

    private String autorId;

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

    public String getUrgencia() {
        return urgencia;
    }

    public String getStatus() {
        return status;
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

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getSeveridade() {
        return severidade;
    }

    public void setSeveridade(Integer severidade) {
        this.severidade = severidade;
    }

    public String getLocalDescricao() {
        return localDescricao;
    }

    public void setLocalDescricao(String localDescricao) {
        this.localDescricao = localDescricao;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getBairro() {
        return bairro;
    }

    public void setBairro(String bairro) {
        this.bairro = bairro;
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

    public String getEvidenciaInicial() {
        return evidenciaInicial;
    }

    public void setEvidenciaInicial(String evidenciaInicial) {
        this.evidenciaInicial = evidenciaInicial;
    }

    public String getActorId() {
        return actorId;
    }

    public void setActorId(String actorId) {
        this.actorId = actorId;
    }

    public Long getProblemaId() {
        return problemaId;
    }

    public void setProblemaId(Long problemaId) {
        this.problemaId = problemaId;
    }

    public Long getPotencialidadeId() {
        return potencialidadeId;
    }

    public void setPotencialidadeId(Long potencialidadeId) {
        this.potencialidadeId = potencialidadeId;
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

    public Instant getValidadaAt() {
        return validadaAt;
    }

    public void setValidadaAt(Instant validadaAt) {
        this.validadaAt = validadaAt;
    }

    public Instant getRejeitadaAt() {
        return rejeitadaAt;
    }

    public void setRejeitadaAt(Instant rejeitadaAt) {
        this.rejeitadaAt = rejeitadaAt;
    }
}
