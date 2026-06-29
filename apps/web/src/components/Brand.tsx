interface BrandProps {
  small?: boolean;
  tagline?: boolean;
}

// The Angico wordmark (white logo art) + the optional tagline. White art, so it
// sits on the dark surfaces where Brand appears (sidebar, landing/login headers).
export default function Brand({ small = false, tagline = true }: BrandProps) {
  return (
    <div className={`brand-lockup ${small ? 'small' : ''}`}>
      <img className="brand-logo" src="/angico-logo-white.png" alt="Angico" />
      {tagline && <span className="logo-tagline">Memória que transforma</span>}
    </div>
  );
}
