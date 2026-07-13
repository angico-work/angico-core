package com.angico.pessoas;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PessoaRepository extends JpaRepository<Pessoa, Long> {

    List<Pessoa> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    @Query("""
            select p from Pessoa p
            where p.workspaceId = :workspaceId
               or exists (
                   select membership.id from WorkspaceMember membership
                   where membership.workspaceId = :workspaceId
                     and upper(membership.status) = 'ACTIVE'
                     and lower(membership.actorId) = lower(
                         case when substring(trim(p.angicoId), 1, 1) = '@'
                             then substring(trim(p.angicoId), 2, length(trim(p.angicoId)))
                             else trim(p.angicoId)
                         end
                     )
               )
            order by p.createdAt desc
            """)
    List<Pessoa> findVisibleInWorkspace(@Param("workspaceId") String workspaceId);

    long countByWorkspaceId(String workspaceId);

    Optional<Pessoa> findByEmailIgnoreCase(String email);

    @Query("""
            select p from Pessoa p
            where lower(
                case when substring(trim(p.angicoId), 1, 1) = '@'
                    then substring(trim(p.angicoId), 2, length(trim(p.angicoId)))
                    else trim(p.angicoId)
                end
            ) = lower(:angicoId)
            """)
    Optional<Pessoa> findByAngicoIdIgnoreCase(@Param("angicoId") String angicoId);

    Optional<Pessoa> findByAuthTokenHash(String authTokenHash);

    @Query("""
            select p from Pessoa p
            where p.workspaceId = :workspaceId
              and lower(
                  case when substring(trim(p.angicoId), 1, 1) = '@'
                      then substring(trim(p.angicoId), 2, length(trim(p.angicoId)))
                      else trim(p.angicoId)
                  end
              ) = lower(:angicoId)
            """)
    Optional<Pessoa> findByWorkspaceIdAndAngicoIdIgnoreCase(
            @Param("workspaceId") String workspaceId,
            @Param("angicoId") String angicoId
    );

    Optional<Pessoa> findByWorkspaceIdAndEmailIgnoreCase(String workspaceId, String email);

    @Query("select p from Pessoa p where p.workspaceId = :ws and ("
            + "lower(coalesce(p.angicoId, '')) like lower(concat('%', :q, '%')) "
            + "or lower(p.nome) like lower(concat('%', :q, '%'))) order by p.nome asc")
    List<Pessoa> searchInWorkspace(@Param("ws") String ws, @Param("q") String q);

    @Query("""
            select p from Pessoa p
            where (
                p.workspaceId = :workspaceId
                or exists (
                    select membership.id from WorkspaceMember membership
                    where membership.workspaceId = :workspaceId
                      and upper(membership.status) = 'ACTIVE'
                      and lower(membership.actorId) = lower(
                          case when substring(trim(p.angicoId), 1, 1) = '@'
                              then substring(trim(p.angicoId), 2, length(trim(p.angicoId)))
                              else trim(p.angicoId)
                          end
                      )
                )
            )
              and (
                  lower(coalesce(p.angicoId, '')) like lower(concat('%', :query, '%'))
                  or lower(p.nome) like lower(concat('%', :query, '%'))
              )
            order by p.nome asc
            """)
    List<Pessoa> searchVisibleInWorkspace(
            @Param("workspaceId") String workspaceId,
            @Param("query") String query
    );
}
