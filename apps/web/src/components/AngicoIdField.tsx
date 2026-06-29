import { useEffect, useRef, useState } from 'react';
import { searchPessoas } from '../lib/api';
import type { PessoaHit } from '../types';

interface Props {
  workspaceId: string;
  value: string;
  onChange: (text: string) => void;
  onPick: (pessoa: PessoaHit) => void;
  id?: string;
  placeholder?: string;
}

// Debounced autocomplete that links a território member to a real Angico
// identity: it searches the people database by Angico ID or name and, on pick,
// fills the handle (and prefills the name). Reuses the .address-field styles.
export default function AngicoIdField({ workspaceId, value, onChange, onPick, id, placeholder }: Props) {
  const [results, setResults] = useState<PessoaHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const justPicked = useRef(false);

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      const found = await searchPessoas(workspaceId, q, ctrl.signal);
      setResults(found);
      setOpen(true);
      setLoading(false);
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value, workspaceId]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function choose(pessoa: PessoaHit) {
    justPicked.current = true;
    onPick(pessoa);
    setOpen(false);
    setResults([]);
  }

  const showEmpty = open && !loading && results.length === 0 && value.trim().length >= 2;

  return (
    <div className="address-field" ref={boxRef}>
      <input
        id={id}
        type="text"
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {loading && <span className="address-field__spinner" aria-hidden="true" />}
      {open && results.length > 0 && (
        <ul className="address-field__menu" role="listbox">
          {results.map((p) => (
            <li
              key={p.id}
              role="option"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
            >
              <span className="address-field__name">{p.nome}</span>
              <span className="address-field__meta">
                {p.angicoId ? `@${p.angicoId}` : 'sem Angico ID'}{p.papel ? ` · ${p.papel}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      {showEmpty && (
        <ul className="address-field__menu">
          <li className="address-field__empty">
            Nenhuma pessoa encontrada para “{value.trim()}”.
            <span className="address-field__hint">Preencha o nome abaixo para cadastrar uma nova pessoa com este Angico ID.</span>
          </li>
        </ul>
      )}
    </div>
  );
}
