# Angico API — Scaffold Design

Date: 2026-06-24

## Context

Fresh repository (`angico-core`), no prior commits. The only existing source file
was a broken placeholder (`com/angico/AngicoAppApplication.java` with an invalid
`package main.java...` declaration and no Spring Boot wiring). The user provided a
package tree for a Spring Boot modular monolith under
`apps/api/src/main/java/com/angico` and asked to create the files following that
structure.

This document records the approved design for scaffolding that tree as **compilable
skeletons** — every file gets the correct package and Spring stereotype, the project
compiles and boots, but no domain logic is invented.

## Decisions

- **Root package:** `com.angico` (the existing broken `AngicoAppApplication.java` is
  removed and replaced by `AngicoApplication.java`).
- **Build:** Maven, Spring Boot **4.0.3** (the 4.x line requires Java 25+ to build and
  is compatible up to and including Java 26 — matching this environment's Java 25 LTS /
  Java 26 Maven runtime). Java release target **25**.
- **Dependencies:** `spring-boot-starter-web`, `spring-boot-starter-data-jpa`,
  `spring-boot-starter-validation`, `h2` (runtime, in-memory — so the app boots without
  an external DB; swappable for Postgres later), `spring-boot-starter-test`.
- **Entity ids:** single `Long id` with `@GeneratedValue(strategy = IDENTITY)`. No other
  fields — domain attributes are intentionally left out.
- **Content depth:** compilable skeletons only. No business methods, no REST endpoints
  (beyond a generic health check), no DTO fields.

## File archetypes

| Tree suffix | Skeleton |
|---|---|
| `Xxx` (domain entity) | `@Entity` + single `Long id` and accessors |
| `XxxRepository` | `@Repository interface … extends JpaRepository<Xxx, Long>` |
| `XxxService` and `…WorkflowService` / `…ValidationService` / `…QueryService` / `…PrioritizationService` / `…StorageService` / `…AccessService` | `@Service` class, constructor-injects its repository (+ the module's `MemoryPublisher` where one exists). Stateless skeletons inject nothing. |
| `XxxController` | `@RestController @RequestMapping("/api/<module>")`, constructor-injects the service. No endpoints. |
| `XxxRequest` / `XxxResponse` / `…CreateRequest` / `…UpdateRequest` / `…MetadataResponse` | empty `record` |
| `XxxMemoryPublisher` | `@Component`, injects `core.memory.MemoryGateway` |

`common/` holds generic infrastructure (not domain logic): `HealthController`
(`GET /health` → `{"status":"UP"}`), `ApiExceptionHandler` (`@RestControllerAdvice` with
one generic `ProblemDetail` handler), `ClockProvider` (`Instant now()`),
`CurrentActorProvider` (`Optional<String> currentActor()`).

## Inferred packages (empty in the source tree)

- **`core/memory`** — the dependency every module's `*MemoryPublisher` needs:
  - `MemoryEvent` — record `(type, aggregateId, payload, occurredAt)`
  - `MemoryGateway` — outbound port: `void publish(MemoryEvent event)`
  - `LoggingMemoryGateway` — default `@Component` implementation (logs), so the context
    has a concrete bean and boots.
- **Light placeholders** (one minimal type + `package-info.java` documenting intent):
  `core/ontology/OntologyTerm`, `core/history/HistoryEvent`,
  `core/sync/SyncCoordinator`, `intelligence/knowledge/KnowledgeBase`.

## Verification

`mvn -DskipTests compile` against the project JDK must succeed. The result is reported
honestly, including the Spring Boot version actually resolved.

## Out of scope (deliberately)

- Domain attributes on entities, JPA relationships, validation constraints.
- REST endpoints and request/response bodies.
- Service business logic and workflow transitions.
- Real implementations for `ontology`, `history`, `sync`, `intelligence/knowledge`.
- Persistence beyond in-memory H2; security/authentication.
