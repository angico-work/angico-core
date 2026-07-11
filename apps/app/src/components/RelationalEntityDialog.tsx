import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createAcao, createMissao, listMissoes, listProblemas, listTerritorios } from '../lib/api';
import type { MissaoRegistro, PessoaHit, Problema, Territorio } from '../types';
import AngicoIdField from './AngicoIdField';
import ModalDialog from './ModalDialog';

export type RelationalEntityType = 'missao' | 'acao';

interface Props {
  type: RelationalEntityType;
  workspaceId: string;
  initialMissaoId?: string;
  onClose: () => void;
  onCreated: () => void;
}

const META = {
  missao: {
    title: 'Nova missão',
    overline: 'Compromisso coletivo',
    description: 'Relacione a missão ao lugar, ao problema reconhecido e à pessoa responsável.',
    titleLabel: 'Objetivo da missão',
    submitLabel: 'Criar missão'
  },
  acao: {
    title: 'Nova ação',
    overline: 'Trabalho realizado',
    description: 'Relacione a ação à missão que ela executa e à pessoa responsável.',
    titleLabel: 'Ação realizada',
    submitLabel: 'Criar ação'
  }
} as const;

export default function RelationalEntityDialog({
  type,
  workspaceId,
  initialMissaoId,
  onClose,
  onCreated
}: Props) {
  const meta = META[type];
  const [territories, setTerritories] = useState<Territorio[]>([]);
  const [problems, setProblems] = useState<Problema[]>([]);
  const [missions, setMissions] = useState<MissaoRegistro[]>([]);
  const [territorioId, setTerritorioId] = useState('');
  const [problemaId, setProblemaId] = useState('');
  const [missaoId, setMissaoId] = useState('');
  const [responsibleQuery, setResponsibleQuery] = useState('');
  const [responsible, setResponsible] = useState<PessoaHit | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setTerritories([]);
    setProblems([]);
    setMissions([]);
    setTerritorioId('');
    setProblemaId('');
    setMissaoId('');
    setResponsible(null);
    setResponsibleQuery('');
    setLoadingOptions(true);
    setOptionsError(null);
    const request = type === 'missao'
      ? Promise.all([listTerritorios(workspaceId), listProblemas(workspaceId)])
        .then(([nextTerritories, nextProblems]) => ({ nextTerritories, nextProblems, nextMissions: [] as MissaoRegistro[] }))
      : listMissoes(workspaceId)
        .then((nextMissions) => ({ nextTerritories: [] as Territorio[], nextProblems: [] as Problema[], nextMissions }));
    request.then(({ nextTerritories, nextProblems, nextMissions }) => {
      if (!active) return;
      setTerritories(nextTerritories);
      setProblems(nextProblems);
      setMissions(nextMissions);
      if (type === 'acao' && initialMissaoId && nextMissions.some((mission) => String(mission.id) === initialMissaoId)) {
        setMissaoId(initialMissaoId);
      }
    }).catch((caught) => {
      if (active) setOptionsError(caught instanceof Error ? caught.message : 'Não foi possível carregar as opções.');
    }).finally(() => {
      if (active) setLoadingOptions(false);
    });
    return () => { active = false; };
  }, [initialMissaoId, type, workspaceId]);

  const availableProblems = useMemo(() => problems.filter(
    (problem) => territorioId && problem.territorioId === territorioId
  ), [problems, territorioId]);

  function changeTerritory(next: string) {
    setTerritorioId(next);
    if (!problems.some((problem) => String(problem.id) === problemaId && problem.territorioId === next)) {
      setProblemaId('');
    }
  }

  function changeResponsibleQuery(next: string) {
    setResponsibleQuery(next);
    if (responsible && next !== `${responsible.nome}${responsible.angicoId ? ` · @${responsible.angicoId}` : ''}`) {
      setResponsible(null);
    }
  }

  function pickResponsible(person: PessoaHit) {
    setResponsible(person);
    setResponsibleQuery(`${person.nome}${person.angicoId ? ` · @${person.angicoId}` : ''}`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError(`Informe ${type === 'missao' ? 'o objetivo da missão' : 'a ação realizada'}.`);
      document.getElementById('relation-title')?.focus();
      return;
    }
    if (type === 'missao' && (!territorioId || !problemaId)) {
      setError('Selecione o território e o problema de origem.');
      document.getElementById(territorioId ? 'relation-problem' : 'relation-territory')?.focus();
      return;
    }
    if (type === 'acao' && !missaoId) {
      setError('Selecione a missão que esta ação executa.');
      document.getElementById('relation-mission')?.focus();
      return;
    }
    if (!responsible) {
      setError('Escolha uma pessoa responsável entre os resultados da busca.');
      document.getElementById('relation-responsible')?.focus();
      return;
    }
    setSubmitting(true);
    try {
      if (type === 'missao') {
        await createMissao({
          workspaceId,
          territorioId,
          problemaId,
          responsavelId: String(responsible.id),
          titulo: title.trim(),
          descricao: description.trim() || undefined
        });
      } else {
        await createAcao({
          workspaceId,
          missaoId,
          responsavelId: String(responsible.id),
          titulo: title.trim(),
          descricao: description.trim() || undefined
        });
      }
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o registro.');
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog
      titleId="relational-dialog-title"
      descriptionId="relational-dialog-description"
      className="modal-card relational-dialog"
      busy={submitting}
      onClose={onClose}
    >
      <header className="dialog-head">
        <div>
          <span className="overline">{meta.overline}</span>
          <h2 id="relational-dialog-title">{meta.title}</h2>
          <p id="relational-dialog-description">{meta.description}</p>
        </div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose} disabled={submitting}>×</button>
      </header>
      <form onSubmit={submit}>
        {type === 'missao' ? (
          <div className="field-row">
            <div className="field">
              <label htmlFor="relation-territory">Território</label>
              <select id="relation-territory" value={territorioId} onChange={(event) => changeTerritory(event.target.value)} required disabled={loadingOptions || Boolean(optionsError)}>
                <option value="">Selecione por nome</option>
                {territories.map((territory) => <option key={territory.id} value={String(territory.id)}>{territory.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="relation-problem">Problema de origem</label>
              <select id="relation-problem" value={problemaId} onChange={(event) => setProblemaId(event.target.value)} required disabled={!territorioId || loadingOptions || Boolean(optionsError)}>
                <option value="">{territorioId ? 'Selecione por nome' : 'Escolha o território primeiro'}</option>
                {availableProblems.map((problem) => <option key={problem.id} value={String(problem.id)}>{problem.titulo}</option>)}
              </select>
              {territorioId && availableProblems.length === 0 && <small>Nenhum problema deste território está disponível.</small>}
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="relation-mission">Missão</label>
            <select id="relation-mission" value={missaoId} onChange={(event) => setMissaoId(event.target.value)} required disabled={loadingOptions || Boolean(optionsError)}>
              <option value="">Selecione por nome</option>
              {missions.map((mission) => <option key={mission.id} value={String(mission.id)}>{mission.titulo}</option>)}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="relation-responsible">Pessoa responsável</label>
          <AngicoIdField
            id="relation-responsible"
            workspaceId={workspaceId}
            value={responsibleQuery}
            onChange={changeResponsibleQuery}
            onPick={pickResponsible}
            placeholder="Busque por nome ou @identidade"
          />
          {responsible && <small role="status">Selecionada: {responsible.nome}{responsible.angicoId ? ` (@${responsible.angicoId})` : ''}</small>}
        </div>

        <div className="field">
          <label htmlFor="relation-title">{meta.titleLabel}</label>
          <input id="relation-title" data-autofocus value={title} onChange={(event) => setTitle(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="relation-description">Descrição <span>opcional</span></label>
          <textarea id="relation-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>

        {loadingOptions && <div className="inline-status" role="status">Carregando opções deste espaço de trabalho…</div>}
        {optionsError && <div className="form-error" role="alert">{optionsError}</div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className="dialog-actions">
          <button type="button" className="ghost-button" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={submitting || loadingOptions || Boolean(optionsError)}>{submitting ? 'Salvando…' : meta.submitLabel}</button>
        </footer>
      </form>
    </ModalDialog>
  );
}
