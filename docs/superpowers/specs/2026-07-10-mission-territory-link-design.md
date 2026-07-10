# Mission Territory Link Design

## Goal

Close the territory gap in the `Problema -> Missao -> Acao` operational chain without inventing links for legacy or intentionally unscoped missions.

## Decisions

- Add a nullable `territorio_id` column to `missao` in additive Flyway V6 migrations for H2 and PostgreSQL.
- Represent `territorioId` as `String` in the mission entity and API contracts, matching `ProblemaSocioambiental` and the existing string-based cross-entity references.
- Accept `territorioId` as optional on mission creation so existing clients and rows remain valid.
- When `territorioId` is supplied, require a positive numeric ID, an existing territory, and the same workspace as the mission request.
- Return `territorioId` from both create and list responses.
- Publish the canonical `MISSAO ATUA_EM TERRITORIO` operational-memory relation only when a territory was explicitly supplied.
- Do not infer a territory from the linked problem, backfill legacy rows, or change `RastroService`; a missing territory must remain an honest traceability gap.

## Data Flow

`MissaoController` validates the request shape and delegates to `MissaoService`. The service authorizes the workspace, resolves optional problem, responsible person, and territory references inside that workspace, then saves the mission. `MissaoMemoryPublisher` publishes the mission object and event, followed by explicit `ENFRENTA`, `RESPONSAVEL_POR`, and `ATUA_EM` relations for supplied references. `MissaoResponse.from` exposes the persisted territory on create and list paths.

## Failure Semantics

- Missing or malformed territory IDs return `400 Bad Request` through the existing `IllegalArgumentException` handling.
- An existing territory in another workspace returns `403 Forbidden` through the existing `ForbiddenException` handling.
- Omitting `territorioId` remains valid and publishes no `ATUA_EM` relation.
- Transactional creation keeps the mission row and operational-memory publication atomic.

## Migration

Create matching `V6__mission_territory.sql` files under the H2 and PostgreSQL migration locations. Each migration adds the nullable column with `IF NOT EXISTS` and creates an index on `(workspace_id, territorio_id)`. No destructive DDL, data rewrite, or foreign key is added because workspace consistency is enforced by the domain service and legacy data must remain loadable.

## Tests

Use integration tests against the real Spring/JPA/memory path:

1. Create a mission with a territory and verify the create response, subsequent list response, persisted entity, and active `MISSAO ATUA_EM TERRITORIO` relation.
2. Create without a territory and verify compatibility plus absence of an invented relation.
3. Submit a malformed or nonexistent territory and expect `400` with no mission persisted.
4. Submit a territory from another workspace and expect `403` with no mission or relation persisted.
5. Run migration validation for both H2 and PostgreSQL SQL locations through the existing test suite and a full Maven test run.

## Scope

Changes are limited to the mission domain, the shared workspace reference validation path already used by that domain, additive V6 migrations, and focused tests. `RastroService`, frontend code, deployment, and external databases are out of scope.
