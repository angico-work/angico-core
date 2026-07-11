import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import AngicoIdField from '../components/AngicoIdField';
import type { AppContext } from '../components/AppShell';
import ModalDialog from '../components/ModalDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/PageFeedback';
import {
  createOrganizacao,
  createParticipacao,
  listMissoes,
  listOrganizacoes,
  listParticipacoes,
  listPessoas
} from '../lib/api';
import type {
  MissaoRegistro,
  Organizacao,
  OrganizacaoTipo,
  OrganizationMissionRelation,
  Participacao,
  ParticipacaoPapel,
  PessoaHit
} from '../types';

const ORGANIZATION_TYPES: { value: OrganizacaoTipo; label: string }[] = [
  { value: 'COLETIVO', label: 'Coletivo' },
  { value: 'ASSOCIACAO', label: 'Associação' },
  { value: 'ONG', label: 'ONG' },
  { value: 'COOPERATIVA', label: 'Cooperativa' },
  { value: 'ESCOLA', label: 'Escola' },
  { value: 'PODER_PUBLICO', label: 'Poder público' },
  { value: 'EMPRESA', label: 'Empresa' },
  { value: 'OUTRA', label: 'Outra' }
];

const MISSION_RELATIONS: { value: OrganizationMissionRelation; label: string }[] = [
  { value: 'CONDUZ', label: 'Conduz' },
  { value: 'MOBILIZA', label: 'Mobiliza' }
];

const PARTICIPATION_ROLES: { value: ParticipacaoPapel; label: string }[] = [
  { value: 'MEMBRO', label: 'Membro' },
  { value: 'COORDENACAO', label: 'Coordenação' },
  { value: 'VOLUNTARIADO', label: 'Voluntariado' },
  { value: 'REPRESENTACAO', label: 'Representação' },
  { value: 'PARCEIRO', label: 'Parceiro' }
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR');
}

function OrganizationDialog({ workspaceId, missions, onClose, onCreated }: {
  workspaceId: string;
  missions: MissaoRegistro[];
  onClose: () => void;
  onCreated: (organization: Organizacao) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<OrganizacaoTipo>('COLETIVO');
  const [missionId, setMissionId] = useState('');
  const [missionRelation, setMissionRelation] = useState<OrganizationMissionRelation | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeMission(next: string) {
    setMissionId(next);
    if (!next) setMissionRelation('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Informe o nome da organização.');
      document.getElementById('organization-name')?.focus();
      return;
    }
    if (missionId && !missionRelation) {
      setError('Escolha como a organização se relaciona com a missão.');
      document.getElementById('organization-mission-relation')?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      onCreated(await createOrganizacao({
        workspaceId,
        nome: trimmedName,
        tipo: type,
        ...(missionId && missionRelation ? { missaoId: Number(missionId), missionRelation } : {})
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar a organização.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog titleId="new-organization-title" descriptionId="new-organization-description" busy={submitting} onClose={onClose}>
      <header className="dialog-head">
        <div>
          <span className="overline">Rede territorial</span>
          <h2 id="new-organization-title">Nova organização</h2>
          <p id="new-organization-description">Cadastre o grupo e, quando existir, relacione-o a uma missão pelo nome.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose} disabled={submitting}>×</button>
      </header>
      <form onSubmit={submit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="organization-name">Nome da organização</label>
            <input id="organization-name" data-autofocus value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} />
          </div>
          <div className="field">
            <label htmlFor="organization-type">Tipo</label>
            <select id="organization-type" value={type} onChange={(event) => setType(event.target.value as OrganizacaoTipo)}>
              {ORGANIZATION_TYPES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="organization-mission">Missão relacionada <span>opcional</span></label>
            <select id="organization-mission" value={missionId} onChange={(event) => changeMission(event.target.value)}>
              <option value="">Sem missão relacionada</option>
              {missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.titulo}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="organization-mission-relation">Relação com a missão</label>
            <select
              id="organization-mission-relation"
              value={missionRelation}
              onChange={(event) => setMissionRelation(event.target.value as OrganizationMissionRelation | '')}
              disabled={!missionId}
              required={Boolean(missionId)}
            >
              <option value="">Selecione</option>
              {MISSION_RELATIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </div>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className="dialog-actions">
          <button className="ghost-button" type="button" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar organização'}</button>
        </footer>
      </form>
    </ModalDialog>
  );
}

function ParticipationDialog({ workspaceId, organization, people, onClose }: {
  workspaceId: string;
  organization: Organizacao;
  people: PessoaHit[];
  onClose: () => void;
}) {
  const [participations, setParticipations] = useState<Participacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [personQuery, setPersonQuery] = useState('');
  const [person, setPerson] = useState<PessoaHit | null>(null);
  const [role, setRole] = useState<ParticipacaoPapel>('MEMBRO');
  const [startedAt, setStartedAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeParticipations = useMemo(
    () => participations.filter((participation) => participation.status === 'ATIVA' && participation.endedAt == null),
    [participations]
  );
  const personNames = useMemo(() => new Map(people.map((entry) => [entry.id, entry.nome])), [people]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    listParticipacoes(organization.id, workspaceId).then((next) => {
      if (active) setParticipations(next);
    }).catch((caught) => {
      if (active) setLoadError(caught instanceof Error ? caught.message : 'Não foi possível carregar as participações.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [organization.id, workspaceId]);

  function changePersonQuery(next: string) {
    setPersonQuery(next);
    if (person && next !== `${person.nome}${person.angicoId ? ` · @${person.angicoId}` : ''}`) setPerson(null);
  }

  function pickPerson(next: PessoaHit) {
    setPerson(next);
    setPersonQuery(`${next.nome}${next.angicoId ? ` · @${next.angicoId}` : ''}`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!person) {
      setError('Escolha uma pessoa entre os resultados da busca.');
      document.getElementById('participation-person')?.focus();
      return;
    }
    const start = new Date(startedAt);
    if (!startedAt || Number.isNaN(start.getTime())) {
      setError('Informe quando a participação começou.');
      document.getElementById('participation-start')?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await createParticipacao(organization.id, {
        workspaceId,
        pessoaId: person.id,
        papel: role,
        status: 'ATIVA',
        startedAt: start.toISOString(),
        endedAt: null
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar a participação.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog titleId="new-participation-title" descriptionId="new-participation-description" busy={submitting} onClose={onClose}>
      <header className="dialog-head">
        <div>
          <span className="overline">{organization.nome}</span>
          <h2 id="new-participation-title">Nova participação</h2>
          <p id="new-participation-description">Escolha a pessoa pelo nome e registre uma participação ativa.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose} disabled={submitting}>×</button>
      </header>

      {loading && <LoadingState label="Carregando participações…" />}
      {loadError && <ErrorState message={loadError} />}
      {!loading && !loadError && activeParticipations.length === 0 && (
        <EmptyState title="Nenhuma participação ativa" message="Use o formulário abaixo para registrar a primeira pessoa deste grupo." />
      )}
      {!loading && !loadError && activeParticipations.length > 0 && (
        <section className="record-sheet" aria-label="Participações registradas">
          <header className="record-sheet-head"><span>{activeParticipations.length} {activeParticipations.length === 1 ? 'participação' : 'participações'}</span><span>Ativas</span></header>
          <div className="record-list">
            {activeParticipations.map((participation) => (
              <article className="record-row operational-row" key={participation.id} style={{ '--record-accent': '#37785B' } as React.CSSProperties}>
                <span className="record-mark" aria-hidden="true" />
                <div className="record-main">
                  <h3>{personNames.get(participation.pessoaId) ?? 'Pessoa não disponível'}</h3>
                  <div className="record-meta"><span>{PARTICIPATION_ROLES.find((entry) => entry.value === participation.papel)?.label ?? participation.papel}</span><span>Ativa desde {formatDate(participation.startedAt)}</span></div>
                </div>
                <div className="record-provenance"><strong>Ativa</strong></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="participation-person">Pessoa</label>
          <AngicoIdField
            id="participation-person"
            workspaceId={workspaceId}
            value={personQuery}
            onChange={changePersonQuery}
            onPick={pickPerson}
            placeholder="Busque por nome ou @identidade"
          />
          {person && <small role="status">Selecionada: {person.nome}{person.angicoId ? ` (@${person.angicoId})` : ''}</small>}
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="participation-role">Papel</label>
            <select id="participation-role" value={role} onChange={(event) => setRole(event.target.value as ParticipacaoPapel)}>
              {PARTICIPATION_ROLES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="participation-start">Início da participação</label>
            <input id="participation-start" type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} required />
          </div>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className="dialog-actions">
          <button className="ghost-button" type="button" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Registrando…' : 'Registrar participação'}</button>
        </footer>
      </form>
    </ModalDialog>
  );
}

export default function OrganizacoesPage() {
  const { workspaceId } = useOutletContext<AppContext>();
  const [organizations, setOrganizations] = useState<Organizacao[]>([]);
  const [missions, setMissions] = useState<MissaoRegistro[]>([]);
  const [people, setPeople] = useState<PessoaHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [participationTarget, setParticipationTarget] = useState<Organizacao | null>(null);

  useEffect(() => {
    setCreating(false);
    setParticipationTarget(null);
  }, [workspaceId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    Promise.all([listOrganizacoes(workspaceId), listMissoes(workspaceId), listPessoas(workspaceId)]).then(([nextOrganizations, nextMissions, nextPeople]) => {
      if (!active) return;
      setOrganizations(nextOrganizations);
      setMissions(nextMissions);
      setPeople(nextPeople);
    }).catch((caught) => {
      if (active) setLoadError(caught instanceof Error ? caught.message : 'Não foi possível carregar as organizações.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [workspaceId]);

  const missionNames = useMemo(() => new Map(missions.map((mission) => [mission.id, mission.titulo])), [missions]);

  if (loading) return <LoadingState label="Carregando organizações…" />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="page operational-page">
      <header className="page-head">
        <div>
          <span className="overline">Grupos do território</span>
          <h1>Organizações</h1>
          <p>Registre coletivos e instituições que sustentam o trabalho deste espaço.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setCreating(true)}>Nova organização</button>
      </header>
      {organizations.length === 0 ? (
        <EmptyState
          title="Nenhuma organização cadastrada"
          message="Cadastre o primeiro coletivo ou instituição deste espaço de trabalho."
          action={<button className="secondary-button" type="button" onClick={() => setCreating(true)}>Cadastrar primeira organização</button>}
        />
      ) : (
        <section className="record-sheet" aria-label="Organizações cadastradas">
          <header className="record-sheet-head"><span>{organizations.length} {organizations.length === 1 ? 'organização' : 'organizações'}</span><span>Por nome</span></header>
          <div className="record-list">
            {organizations.map((organization) => {
              const type = ORGANIZATION_TYPES.find((entry) => entry.value === organization.tipo)?.label ?? organization.tipo;
              const relation = MISSION_RELATIONS.find((entry) => entry.value === organization.missionRelation)?.label;
              const mission = organization.missaoId == null ? null : missionNames.get(organization.missaoId);
              return (
                <article className="record-row operational-row" key={organization.id} style={{ '--record-accent': '#0E7C86' } as React.CSSProperties}>
                  <span className="record-mark" aria-hidden="true" />
                  <div className="record-main">
                    <h2>{organization.nome}</h2>
                    <div className="record-meta">
                      <span>{type}</span>
                      {relation && <span>{relation} · {mission ?? 'Missão não disponível'}</span>}
                    </div>
                  </div>
                  <div className="record-provenance">
                    <strong>{organization.status}</strong>
                    <button
                      className="secondary-button"
                      type="button"
                      aria-label={`Registrar participação em ${organization.nome}`}
                      onClick={() => setParticipationTarget(organization)}
                    >Registrar participação</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {creating && (
        <OrganizationDialog
          workspaceId={workspaceId}
          missions={missions}
          onClose={() => setCreating(false)}
          onCreated={(organization) => {
            setOrganizations((current) => [...current, organization].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
            setCreating(false);
          }}
        />
      )}
      {participationTarget && (
        <ParticipationDialog
          workspaceId={workspaceId}
          organization={participationTarget}
          people={people}
          onClose={() => setParticipationTarget(null)}
        />
      )}
    </div>
  );
}
