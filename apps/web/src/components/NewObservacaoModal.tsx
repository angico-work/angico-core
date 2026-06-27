import { useState, type FormEvent } from 'react';
import { createObservacao } from '../lib/api';
import type { ObservacaoInput } from '../types';

const CATEGORIAS = ['Resíduos', 'Água e Saneamento', 'Mobilidade', 'Áreas Verdes', 'Calor e Arborização', 'Outros'];
const URGENCIAS = ['BAIXA', 'MEDIA', 'ALTA'];

interface Props {
  workspaceId: string;
  initialLat?: number;
  initialLng?: number;
  onClose: () => void;
  onCreated: () => void;
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16
};
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: 24, width: 'min(480px, 100%)',
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)'
};

export default function NewObservacaoModal({ workspaceId, initialLat, initialLng, onClose, onCreated }: Props) {
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [urgencia, setUrgencia] = useState('MEDIA');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const input: ObservacaoInput = {
      workspaceId, categoria, titulo,
      descricao: descricao || undefined,
      localizacao: localizacao || undefined,
      urgencia, autorId: 'julia',
      latitude: initialLat,
      longitude: initialLng
    };
    try {
      await createObservacao(input);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setSubmitting(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Nova observação</h2>
        <p style={{ color: '#64748b', marginTop: -8 }}>Registre o que você observou no território.</p>
        {initialLat != null && initialLng != null && (
          <div className="demo-hint" style={{ marginBottom: 12 }}>
            📍 Local marcado no mapa: {initialLat.toFixed(5)}, {initialLng.toFixed(5)}
          </div>
        )}
        <form className="login-card" style={{ boxShadow: 'none', padding: 0 }} onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="obs-categoria">Categoria</label>
            <select id="obs-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="obs-titulo">Título</label>
            <input id="obs-titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Descarte irregular de lixo" />
          </div>
          <div className="field">
            <label htmlFor="obs-descricao">Descrição</label>
            <input id="obs-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes da situação" />
          </div>
          <div className="field">
            <label htmlFor="obs-local">Localização</label>
            <input id="obs-local" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="Ex: Rua das Flores, 245" />
          </div>
          <div className="field">
            <label htmlFor="obs-urgencia">Urgência</label>
            <select id="obs-urgencia" value={urgencia} onChange={(e) => setUrgencia(e.target.value)}>
              {URGENCIAS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: 14 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" className="ghost-button" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar observação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
