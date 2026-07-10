package com.angico.core.memory;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoryRelationRepository extends JpaRepository<StoredMemoryRelation, Long> {

    boolean existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType);

    @Query("""
            select r from StoredMemoryRelation r
            where r.workspaceId = :workspaceId
              and upper(r.originType) = upper(:originType)
              and r.originId = :originId
              and upper(r.destinationType) = upper(:destinationType)
              and r.destinationId = :destinationId
              and upper(r.relationType) = upper(:relationType)
              and r.active = true
            """)
    List<StoredMemoryRelation> findActiveRelation(
            @Param("workspaceId") String workspaceId,
            @Param("originType") String originType,
            @Param("originId") String originId,
            @Param("destinationType") String destinationType,
            @Param("destinationId") String destinationId,
            @Param("relationType") String relationType);

    @Query("""
            select r from StoredMemoryRelation r
            where r.workspaceId = :workspaceId
              and (
                (upper(r.originType) = upper(:entityType) and r.originId = :entityId)
                or
                (upper(r.destinationType) = upper(:entityType) and r.destinationId = :entityId)
              )
            """)
    List<StoredMemoryRelation> findRelationsForNode(
            @Param("workspaceId") String workspaceId,
            @Param("entityType") String entityType,
            @Param("entityId") String entityId);

    @Query("""
            select r from StoredMemoryRelation r
            where r.workspaceId = :workspaceId
              and r.active = true
              and (
                (upper(r.originType) = upper(:entityType) and r.originId = :entityId)
                or
                (upper(r.destinationType) = upper(:entityType) and r.destinationId = :entityId)
              )
            order by r.createdAt asc, r.id asc
            """)
    List<StoredMemoryRelation> findActiveRelationsForNode(
            @Param("workspaceId") String workspaceId,
            @Param("entityType") String entityType,
            @Param("entityId") String entityId,
            Pageable pageable);

    @Query("""
            select (count(r) > 0) from StoredMemoryRelation r
            where r.workspaceId = :workspaceId
              and upper(r.originType) = upper(:originType)
              and r.originId = :originId
              and upper(r.destinationType) = upper(:destinationType)
              and upper(r.relationType) = upper(:relationType)
              and r.active = true
              and exists (
                select o from StoredMemoryObject o
                where o.workspaceId = r.workspaceId
                  and upper(o.entityType) = upper(r.destinationType)
                  and o.entityId = r.destinationId
              )
            """)
    boolean existsActiveFrom(
            @Param("workspaceId") String workspaceId,
            @Param("originType") String originType,
            @Param("originId") String originId,
            @Param("destinationType") String destinationType,
            @Param("relationType") String relationType);

    @Query("""
            select (count(r) > 0) from StoredMemoryRelation r
            where r.workspaceId = :workspaceId
              and upper(r.destinationType) = upper(:destinationType)
              and r.destinationId = :destinationId
              and upper(r.originType) = upper(:originType)
              and upper(r.relationType) = upper(:relationType)
              and r.active = true
              and exists (
                select o from StoredMemoryObject o
                where o.workspaceId = r.workspaceId
                  and upper(o.entityType) = upper(r.originType)
                  and o.entityId = r.originId
              )
            """)
    boolean existsActiveTo(
            @Param("workspaceId") String workspaceId,
            @Param("destinationType") String destinationType,
            @Param("destinationId") String destinationId,
            @Param("originType") String originType,
            @Param("relationType") String relationType);

    @Query("""
            select r from StoredMemoryRelation r
            where r.workspaceId = :workspaceId
              and upper(r.originType) = upper(:originType)
              and r.originId = :originId
              and upper(r.relationType) = upper(:relationType)
              and r.active = true
            """)
    List<StoredMemoryRelation> findActiveRelationsFromOrigin(
            @Param("workspaceId") String workspaceId,
            @Param("originType") String originType,
            @Param("originId") String originId,
            @Param("relationType") String relationType);

    List<StoredMemoryRelation> findByWorkspaceId(String workspaceId);
}
