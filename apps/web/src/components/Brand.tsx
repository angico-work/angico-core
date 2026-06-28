interface BrandProps {
  small?: boolean;
  tagline?: boolean;
}

// Typographic lockup: the Angico leaf as a currentColor mask (it tints itself
// to any context — white on dusk, petrol on light) plus the wordmark in the
// display face. Scales crisply and avoids the bitmap-logo-in-a-box look.
export default function Brand({ small = false, tagline = true }: BrandProps) {
  return (
    <div className={`brand-lockup ${small ? 'small' : ''}`}>
      <span className="brand-mark" aria-hidden="true" />
      <span className="brand-text">
        <span className="brand-word">Angico</span>
        {tagline && <span className="logo-tagline">Memória que transforma</span>}
      </span>
    </div>
  );
}
