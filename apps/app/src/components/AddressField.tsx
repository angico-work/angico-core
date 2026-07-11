import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { searchGeocoding } from '../lib/api';
import type { GeoResult } from '../types';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSelect: (result: GeoResult) => void;
  placeholder?: string;
  id?: string;
  autoFocus?: boolean;
}

export default function AddressField({ value, onChange, onSelect, placeholder, id, autoFocus }: Props) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const justSelected = useRef(false);
  const generatedId = useId();
  const inputId = id ?? `address-search-${generatedId}`;
  const listboxId = `${inputId}-options`;

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const found = await searchGeocoding(q, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setResults(found);
        setActive(-1);
        setOpen(true);
      } catch (caught) {
        if (ctrl.signal.aborted) return;
        setResults([]);
        setOpen(false);
        setError(caught instanceof Error
          ? `Não foi possível buscar endereços. ${caught.message}`
          : 'Não foi possível buscar endereços.');
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function choose(result: GeoResult) {
    justSelected.current = true;
    onChange(result.displayName);
    onSelect(result);
    setOpen(false);
    setResults([]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showEmpty = open && !loading && results.length === 0 && value.trim().length >= 3;

  return (
    <div className="address-field" ref={boxRef}>
      <input
        id={inputId}
        type="text"
        value={value}
        autoFocus={autoFocus}
        data-autofocus={autoFocus || undefined}
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
      {error && <span className="address-field__error" role="alert">{error}</span>}
      {open && results.length > 0 && (
        <ul id={listboxId} className="address-field__menu" role="listbox">
          {results.map((r, i) => (
            <li
              key={`${r.displayName}-${i}`}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r);
              }}
            >
              <span className="address-field__name">{r.displayName.split(',')[0].trim() || r.city || r.displayName}</span>
              <span className="address-field__meta">
                {[...new Set([r.neighborhood, r.city, r.state].filter(Boolean))].join(' · ') || r.country || r.displayName}
              </span>
            </li>
          ))}
        </ul>
      )}
      {showEmpty && (
        <ul className="address-field__menu">
          <li className="address-field__empty">
            Nenhum endereço encontrado para “{value.trim()}”.
            <span className="address-field__hint">
              Confira a grafia ou inclua a cidade — ex.: “{value.trim()}, Recife”.
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}
