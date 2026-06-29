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
 * {@code slug} do workspace. Esta entidade é o registro que dá a cada slug um
 * nome legível, para que um membro possa alternar entre atividades paralelas.
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

    private String createdBy;

    @Column(nullable = false)
    private Instant createdAt;

    protected Workspace() {
    }

    public Workspace(String slug, String nome, String createdBy, Instant createdAt) {
        this.slug = slug;
        this.nome = nome;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
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

    public String getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
