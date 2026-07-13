import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { updateProfile } from '../lib/api';
import type { PessoaHit } from '../types';
import ModalDialog from './ModalDialog';

async function fileToDataUrl(file: File, max = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export default function ProfileModal({ profile, onClose, onSaved }: {
  profile: PessoaHit; onClose: () => void; onSaved: (p: PessoaHit) => void;
}) {
  const [nome, setNome] = useState(profile.nome);
  const [telefone, setTelefone] = useState(profile.telefone ?? '');
  const [foto, setFoto] = useState<string | null>(profile.foto);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  async function onPickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFoto(await fileToDataUrl(file));
    } catch {
      setError('Não foi possível processar a imagem.');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({ nome, telefone, foto: foto ?? '' });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setSaving(false);
    }
  }

  return (
    <ModalDialog titleId="profile-dialog-title" busy={saving} onClose={onClose}>
        <header className="dialog-head">
          <h2 id="profile-dialog-title">Editar perfil</h2>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose} disabled={saving}>×</button>
        </header>
        <form onSubmit={submit}>
          <div className="profile-photo-row">
            <div className="profile-avatar">
              {foto ? <img src={foto} alt="" /> : initials(nome)}
            </div>
            <div className="profile-photo-actions">
              <button type="button" className="ghost-button" onClick={() => photoInput.current?.click()}>
                {foto ? 'Trocar foto' : 'Adicionar foto'}
              </button>
              <input ref={photoInput} type="file" accept="image/*" hidden onChange={onPickPhoto} />
              {foto && <button type="button" className="button small" onClick={() => setFoto(null)}>Remover</button>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="prof-nome">Nome *</label>
            <input id="prof-nome" data-autofocus required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="prof-tel">Telefone</label>
            <input id="prof-tel" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(81) 99999-0000" />
          </div>
          {profile.angicoId && (
            <div className="field">
              <label htmlFor="prof-id">Angico ID</label>
              <input id="prof-id" className="mono" value={`@${profile.angicoId}`} readOnly />
            </div>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}
          <footer className="dialog-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar perfil'}</button>
          </footer>
        </form>
    </ModalDialog>
  );
}
