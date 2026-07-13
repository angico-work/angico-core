package com.angico.organizacoes;

import com.angico.common.ClockProvider;
import com.angico.common.ConflictException;
import com.angico.common.ForbiddenException;
import com.angico.pessoas.Pessoa;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizacaoService {

    private static final Set<String> ORGANIZATION_TYPES = Set.of(
            "COLETIVO", "ASSOCIACAO", "ONG", "COOPERATIVA", "ESCOLA",
            "PODER_PUBLICO", "EMPRESA", "OUTRA");
    private static final Set<String> MISSION_RELATIONS = Set.of("CONDUZ", "MOBILIZA");
    private static final Set<String> PARTICIPATION_ROLES = Set.of(
            "MEMBRO", "COORDENACAO", "VOLUNTARIADO", "REPRESENTACAO", "PARCEIRO");
    private static final Set<String> PARTICIPATION_STATUSES = Set.of("ATIVA");

    private final OrganizacaoRepository organizationRepository;
    private final ParticipacaoRepository participationRepository;
    private final OrganizacaoMemoryPublisher publisher;
    private final WorkspaceAuthorizationService authorization;
    private final WorkspaceReferenceValidator references;
    private final ClockProvider clock;

    public OrganizacaoService(
            OrganizacaoRepository organizationRepository,
            ParticipacaoRepository participationRepository,
            OrganizacaoMemoryPublisher publisher,
            WorkspaceAuthorizationService authorization,
            WorkspaceReferenceValidator references,
            ClockProvider clock
    ) {
        this.organizationRepository = organizationRepository;
        this.participationRepository = participationRepository;
        this.publisher = publisher;
        this.authorization = authorization;
        this.references = references;
        this.clock = clock;
    }

    @Transactional
    public OrganizacaoResponse create(OrganizacaoCreateRequest request) {
        String workspaceId = authorization.requireWritableWorkspace(request.workspaceId());
        String type = enumValue(request.tipo(), ORGANIZATION_TYPES, "tipo");
        MissionLink mission = validateMissionLink(request.missaoId(), request.missionRelation(), workspaceId);

        Organizacao organization = new Organizacao();
        organization.setWorkspaceId(workspaceId);
        organization.setNome(request.nome().strip());
        organization.setTipo(type);
        organization.setStatus("ATIVA");
        organization.setMissionId(mission.id());
        organization.setMissionRelation(mission.relation());
        organization.setActorId(authorization.currentActorId());
        organization.setCreatedAt(clock.now());
        organization = organizationRepository.save(organization);
        publisher.publishOrganization(organization);
        return OrganizacaoResponse.from(organization);
    }

    @Transactional(readOnly = true)
    public List<OrganizacaoResponse> list(String requestedWorkspaceId) {
        String workspaceId = authorization.requireAuthorizedWorkspace(requestedWorkspaceId);
        return organizationRepository.findByWorkspaceIdOrderByNomeAsc(workspaceId).stream()
                .map(OrganizacaoResponse::from)
                .toList();
    }

    @Transactional
    public ParticipacaoResponse createParticipation(Long organizationId, ParticipacaoRequest request) {
        String workspaceId = authorization.requireWritableWorkspace(request.workspaceId());
        Organizacao organization = requireOrganization(organizationId, workspaceId);
        Pessoa person = references.requirePessoa(String.valueOf(request.pessoaId()), workspaceId);
        String role = enumValue(request.papel(), PARTICIPATION_ROLES, "papel");
        String status = enumValue(request.status(), PARTICIPATION_STATUSES, "status");
        Instant now = clock.now();
        validateActiveParticipationPeriod(request.startedAt(), request.endedAt(), now);

        if (participationRepository
                .findByWorkspaceIdAndOrganizationIdAndPessoaIdAndStatus(
                        workspaceId, organization.getId(), person.getId(), "ATIVA")
                .isPresent()) {
            throw new ConflictException("A pessoa já possui participação ativa nesta organização.");
        }

        Participacao participation = new Participacao(
                workspaceId,
                organization.getId(),
                person.getId(),
                role,
                status,
                request.startedAt(),
                request.endedAt(),
                now,
                authorization.currentActorId(),
                activeIdentity(workspaceId, organization.getId(), person.getId())
        );
        try {
            participation = participationRepository.saveAndFlush(participation);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("A pessoa já possui participação ativa nesta organização.");
        }
        publisher.publishParticipation(participation);
        return ParticipacaoResponse.from(participation);
    }

    @Transactional
    public ParticipacaoResponse endParticipation(
            Long organizationId,
            Long participationId,
            ParticipacaoEndRequest request
    ) {
        String workspaceId = authorization.requireWritableWorkspace(request.workspaceId());
        requireOrganization(organizationId, workspaceId);
        Participacao participation = participationRepository
                .findByIdAndWorkspaceIdAndOrganizationId(participationId, workspaceId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Participação não encontrada."));
        if (!"ATIVA".equals(participation.getStatus())) {
            throw new ConflictException("A participação já está encerrada.");
        }
        Instant now = clock.now();
        Instant endedAt = request.endedAt();
        if (endedAt.isBefore(participation.getStartedAt()) || endedAt.isAfter(now.plus(5, ChronoUnit.MINUTES))) {
            throw new IllegalArgumentException("endedAt é inválido para esta participação.");
        }
        participation.end(endedAt);
        participation = participationRepository.save(participation);
        publisher.publishParticipationEnded(participation, authorization.currentActorId());
        return ParticipacaoResponse.from(participation);
    }

    @Transactional(readOnly = true)
    public List<ParticipacaoResponse> listParticipations(Long organizationId, String requestedWorkspaceId) {
        String workspaceId = authorization.requireAuthorizedWorkspace(requestedWorkspaceId);
        Organizacao organization = requireOrganization(organizationId, workspaceId);
        return participationRepository
                .findByWorkspaceIdAndOrganizationIdOrderByStartedAtDesc(workspaceId, organization.getId())
                .stream()
                .map(ParticipacaoResponse::from)
                .toList();
    }

    private Organizacao requireOrganization(Long id, String workspaceId) {
        Organizacao organization = organizationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Organização não encontrada: " + id));
        if (!workspaceId.equals(organization.getWorkspaceId())) {
            throw new ForbiddenException("Organização fora do workspace autorizado.");
        }
        return organization;
    }

    private MissionLink validateMissionLink(Long missionId, String rawRelation, String workspaceId) {
        boolean hasId = missionId != null;
        boolean hasRelation = rawRelation != null && !rawRelation.isBlank();
        if (hasId != hasRelation) {
            throw new IllegalArgumentException("missaoId e missionRelation devem ser informados juntos.");
        }
        if (!hasId) {
            return new MissionLink(null, null);
        }
        references.requireMissao(String.valueOf(missionId), workspaceId);
        return new MissionLink(missionId, enumValue(rawRelation, MISSION_RELATIONS, "missionRelation"));
    }

    private void validateActiveParticipationPeriod(
            Instant startedAt,
            Instant endedAt,
            Instant now
    ) {
        if (startedAt.isBefore(Instant.parse("2000-01-01T00:00:00Z"))
                || startedAt.isAfter(now.plus(5, ChronoUnit.MINUTES))) {
            throw new IllegalArgumentException("startedAt está fora do intervalo permitido.");
        }
        if (endedAt != null) {
            throw new IllegalArgumentException("Participação ativa não pode ter endedAt.");
        }
    }

    private String enumValue(String value, Set<String> allowed, String field) {
        String canonical = value == null ? "" : value.strip().toUpperCase(Locale.ROOT);
        if (!allowed.contains(canonical)) {
            throw new IllegalArgumentException(field + " é inválido.");
        }
        return canonical;
    }

    private String activeIdentity(String workspaceId, Long organizationId, Long pessoaId) {
        try {
            String value = workspaceId + ":" + organizationId + ":" + pessoaId;
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponível.", exception);
        }
    }

    private record MissionLink(Long id, String relation) {
    }
}
