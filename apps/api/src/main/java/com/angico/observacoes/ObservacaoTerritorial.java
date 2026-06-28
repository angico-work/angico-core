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

    public Instant getCreatedAt() {
        return createdAt;
    }
}
