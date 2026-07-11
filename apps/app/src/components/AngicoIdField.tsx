import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { searchPessoas } from '../lib/api';
import type { PessoaHit } from '../types';

interface Props {
  workspaceId: string;
  value: string;
  onChange: (text: string) => void;
  onPick: (pessoa: PessoaHit) => void;
  id?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function AngicoIdField({ workspaceId, value, onChange, onPick, id, placeholder, autoFocus }: Props) {
  const [results, setResults] = useState<PessoaHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const justPicked = useRef(false);
  const searchRequest = useRef(0);
  const generatedId = useId();
  const inputId = id ?? `person-search-${generatedId}`;
  const listboxId = `${inputId}-options`;

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const request = ++searchRequest.current;
    setResults([]);
    setOpen(false);
    setActive(-1);
    setSearchError(null);
    const q = value.trim();
    if (q.length < 2) {
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchPessoas(workspaceId, q, ctrl.signal);
        if (request !== searchRequest.current) return;
        setResults(found);
        setActive(-1);
        setOpen(true);
      } catch (caught) {
        if (request !== searchRequest.current || ctrl.signal.aborted) return;
        setSearchError(caught instanceof Error ? caught.message : 'Não foi possível buscar pessoas.');
      } finally {
        if (request === searchRequest.current && !ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
      if (searchRequest.current === request) searchRequest.current += 1;
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
    setActive(-1);
    setSearchError(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => current <= 0 ? results.length - 1 : current - 1);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(results[active]);
    }
  }

  const showEmpty = open && !loading && !searchError && results.length === 0 && value.trim().length >= 2;

  return (
    <div className="address-field" ref={boxRef}>
      <input
        id={inputId}
        type="text"
        autoFocus={autoFocus}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={open && active >= 0 ? `${listboxId}-${active}` : undefined}
        aria-busy={loading}
      />
      {loading && <span className="address-field__spinner" aria-hidden="true" />}
      {searchError && <div className="address-field__error" role="alert">{searchError}</div>}
      {open && results.length > 0 && (
        <ul id={listboxId} className="address-field__menu" role="listbox">
          {results.map((p, index) => (
            <li
              key={p.id}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'is-active' : ''}
              onMouseEnter={() => setActive(index)}
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
            <span className="address-field__hint">Confira a grafia ou busque por outra parte do nome ou @identidade.</span>
          </li>
        </ul>
      )}
    </div>
  );
}
