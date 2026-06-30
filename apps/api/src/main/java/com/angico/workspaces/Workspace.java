package com.angico.workspaces;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

/**
 * A workspace is the top-level partition of the platform: every observação,
 * problema, potencialidade, mensagem, ponto de mapa e pessoa é escopada pelo
 * {@code slug} do workspace. Esta entidade é o registro nomeado que permite a um
 * membro alternar entre atividades paralelas, com metadados de lugar/estado.
 *
 * <p>O {@code slug} continua sendo a chave de partição usada por todos os
 * módulos — os campos extras (descrição, cidade, estado, centro, status) apenas
 * enriquecem o registro e são nuláveis para conviver com linhas já existentes.
 */
@Entity
@Table(name = "workspace", uniqueConstraints = @UniqueConstraint(name = "uk_workspace_slug", columnNames = "slug"))
public class Workspace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String nome;

    @Column(columnDefinition = "text")
    private String descricao;

    private String cidade;

    private String estado;

    private Double centerLatitude;

    private Double centerLongitude;

    private String status;

    private String createdBy;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant updatedAt;

    protected Workspace() {
    }

    public Workspace(String slug, String nome, String createdBy, Instant createdAt) {
        this.slug = slug;
        this.nome = nome;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
        this.status = "ACTIVE";
    }

    public Long getId() {
        return id;
    }

    public String getSlug() {
        return slug;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
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

    public Double getCenterLatitude() {
        return centerLatitude;
    }

    public void setCenterLatitude(Double centerLatitude) {
        this.centerLatitude = centerLatitude;
    }

    public Double getCenterLongitude() {
        return centerLongitude;
    }

    public void setCenterLongitude(Double centerLongitude) {
        this.centerLongitude = centerLongitude;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
