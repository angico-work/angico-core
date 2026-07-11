package com.angico.workspaces;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

    Optional<Workspace> findBySlug(String slug);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select workspace from Workspace workspace where workspace.slug = :slug")
    Optional<Workspace> findBySlugForUpdate(@Param("slug") String slug);

    boolean existsBySlug(String slug);

    List<Workspace> findAllByOrderByCreatedAtAsc();
}
