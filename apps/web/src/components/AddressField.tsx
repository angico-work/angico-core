import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
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

// A debounced address/city autocomplete backed by /api/geocoding/search.
// Selecting a suggestion hands the full GeoResult (coords + city/UF) upward.
export default function AddressField({ value, onChange, onSelect, placeholder, id, autoFocus }: Props) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const justSelected = useRef(false);

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      const found = await searchGeocoding(q, ctrl.signal);
      setResults(found);
      setActive(-1);
      setOpen(true);
      setLoading(false);
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
        id={id}
        type="text"
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {loading && <span className="address-field__spinner" aria-hidden="true" />}
      {open && results.length > 0 && (
        <ul className="address-field__menu" role="listbox">
          {results.map((r, i) => (
            <li
              key={`${r.displayName}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r);
              }}
            >
              <span className="address-field__name">{r.city ?? r.displayName}</span>
              <span className="address-field__meta">
                {[r.neighborhood, r.state, r.country].filter(Boolean).join(' · ') || r.displayName}
              </span>
            </li>
          ))}
        </ul>
      )}
      {showEmpty && (
        <ul className="address-field__menu">
          <li className="address-field__empty">Nenhum local encontrado para “{value.trim()}”.</li>
        </ul>
      )}
    </div>
  );
}
