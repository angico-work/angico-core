# Angico API Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate OpenAI-powered interpretation, connections, and evidence-based recommendations into Angico without training a model.

**Architecture:** The existing Java backend authorizes each request, retrieves bounded operational context, calls the Responses API, and validates structured suggestions. Human review and feedback remain in Angico. The first delivery uses explicit analysis requests; event-driven background processing is a subsequent delivery after quality and cost evaluation.

**Tech Stack:** Existing Spring Boot/Java, PostgreSQL/Flyway, React/TypeScript; Java HTTP client for OpenAI Responses.

**Spec:** User-approved conversation proposal: API + ontology + memory + human feedback; no proprietary model training or reinforcement-learning claims.

## Global Constraints

- API key exists only on the backend as OPENAI_API_KEY. Never place it in browser code, git, logs, or chat.
- Model is configurable through OPENAI_MODEL; deployment selection requires a supported model and a live smoke test.
- Existing record creation and offline synchronization must work without OpenAI availability.
- No automatic modifications to canonical facts, urgency, severity, or ontology relations.
- Every suggested connection and recommendation references source IDs drawn from authorized context.
- External analysis is explicitly requested in the first delivery; explain that submitted content is processed by an external AI service.
- Exclude private messages, attachments and personal contact details from first-version context.
- Preserve source text; distinguish reported information, generated interpretation and human review.
- No training jobs, vector infrastructure, or new autonomous agent framework in this delivery.

## Review Focus

- Cross-workspace IDs and withdrawn access must never expose source content or permit feedback writes.
- Unknown source IDs, malformed output, refusals and incomplete Responses must not become accepted suggestions.
- Offline mode, timeout, missing configuration and quota exhaustion must not block saving records.
- Editing a draft or changing workspace must invalidate stale analyses and prevent application of outdated suggestions.
- Repeated requests and feedback retries must be bounded and idempotent; evaluate cost before background automation.

## Task 1: Authorized, bounded analysis context

**Files:** Create `apps/api/src/main/java/com/angico/intelligence/IntelligenceContextService.java`, `IntelligenceSource.java`; tests under `apps/api/src/test/java/com/angico/intelligence/`.

**Interfaces:** `List<IntelligenceSource> retrieve(String authorizedWorkspace, String text)`; sources contain entity type, ID, title, excerpt and occurrence time. Reuse WorkspaceAuthorizationService and ontology vocabulary. Use a paginated database query rather than loading the entire workspace timeline.

- [ ] Write failing tests for unauthorized workspace, excluded message entities, empty context and a maximum of 20 sources/20,000 excerpt characters.
- [ ] Run `mvn -Dtest=IntelligenceContextServiceTest test`; confirm failures.
- [ ] Implement deterministic lexical candidate retrieval within authorized observations/problems/actions/results. Report retrieval limits; similarity is not proof of identity or causation.
- [ ] Run targeted tests; commit passing implementation.

## Task 2: Structured API analysis and provenance

**Files:** Create `IntelligenceController.java`, `IntelligenceService.java`, `OpenAiResponsesClient.java`, `IntelligenceAnalysis.java`, `IntelligenceAnalysisRepository.java` in the same package; add a new migration using the next available Flyway version; modify `apps/api/src/main/resources/application.yml`.

**Interfaces:** `POST /api/intelligence/analyses` accepts workspaceId, requestId, entityType, title and description; returns analysisId, status, category suggestion, summary, suggested connections, recommendations and source references. Read status through `GET /api/intelligence/status`. Persist input hash, actor/workspace, model, prompt version, response usage, source IDs and generated suggestions.

- [ ] Write failing tests for cross-workspace access, missing key, timeouts, provider errors, refusals, incomplete responses, unknown references and invalid ontology categories.
- [ ] Run `mvn -Dtest=IntelligenceServiceTest,OpenAiResponsesClientTest test`; confirm failures using a stub provider, never a paid API call.
- [ ] Implement Responses structured output through a fixed OpenAI endpoint, configurable model, bounded output, 20-second provider timeout and no automatic retries. Validate source references and schema server-side. Request at most 3 connections and 3 recommendations. Do not store model-generated confidence as a calibrated probability.
- [ ] Implement an atomic per-user limit of 5 requests per 10 minutes and a configurable workspace daily cap. Persist requestId for deduplication. Same requestId with a different input hash returns conflict; in-progress duplicates do not call the provider twice.
- [ ] Make missing configuration return an explicit unavailable state. Redact provider errors and secrets. Preserve CSRF/session checks on the new routes.
- [ ] Run targeted tests, including a malicious instruction inside source text; commit passing implementation.

## Task 3: Review interface and feedback memory

**Files:** Create `apps/app/src/components/IntelligenceReview.tsx`, `apps/app/src/lib/intelligenceApi.ts` and their tests; modify `apps/app/src/components/NewEntityModal.tsx`; create backend `IntelligenceFeedbackController.java`, `IntelligenceFeedbackService.java` and tests.

**Interfaces:** `requestAnalysis(input, signal)` uses existing `apiFetch`; `POST /api/intelligence/analyses/{id}/feedback` accepts suggestionId, decision (accepted/rejected/corrected), corrected category when relevant, and requestId. Retrieve reviewed category examples only within the same authorized workspace and relevant context.

- [ ] Write failing UI tests for loading, failure, offline mode, explicit category application, sources, stale result invalidation and cancellation on workspace change.
- [ ] Write backend tests for feedback authorization, duplicate requests, invalid corrections and subsequent retrieval of verified examples.
- [ ] Run targeted Vitest and Maven tests; confirm failures.
- [ ] Add the analysis panel with summary, cited connections and recommended next steps. Keep current local classification visibly identified as local; never imply it came from OpenAI.
- [ ] Category application changes only the draft category after user action. Connection suggestions open the referenced record; accepting feedback does not silently create canonical relations or save the draft.
- [ ] Persist human review separately from original generated output. No feedback is presented as model training.
- [ ] Run targeted tests and commit.

## Task 4: Evaluation, deployment and follow-up boundary

**Files:** Extend `docs/FIELD_INTELLIGENCE.md`; add `docs/INTELLIGENCE_OPERATIONS.md`; add regression fixtures under the intelligence test directories.

- [ ] Build an evaluation set covering negation, ambiguous addresses, insufficient evidence, repeated observations, contradictory accounts and cross-workspace isolation. Measure extraction correctness, citation validity, correction rate and abstention; never claim field accuracy from illustrative tests.
- [ ] Run full API `mvn verify`; app/site `npm run verify`; npm audits; inspect CI results before integration.
- [ ] Document OPENAI_API_KEY, OPENAI_MODEL, request limits, disable switch, retention and failure behavior. Inspect existing deployment settings without printing secret values.
- [ ] Configure the key through the deployment secret interface when available; otherwise identify the exact required user action. Do not request the key in chat.
- [ ] Perform a live smoke test with explicitly synthetic input once credentials are available; verify provider response, citations, usage and feedback persistence.
- [ ] Synchronize main/dev/production after successful checks under the user's existing publishing authorization; verify deployment status. Report separately any missing credentials or untested live behavior.
- [ ] Before adding automatic background processing, review observed latency, cost and error rates. That delivery needs durable jobs, retries, revision-based deduplication and invalidation of outdated analyses.

## Self-review

The plan covers the approved API-based direction, authorization, provenance, human feedback and offline preservation. Initial context retrieval is lexical and bounded, not an exhaustive semantic search. The first delivery handles analysis on explicit request; automatic processing and aggregate territory summaries remain the next delivery, not implied completed features. No implementation or live API configuration has been performed by this planning document.
