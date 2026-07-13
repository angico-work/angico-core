interface BrandProps {
  small?: boolean;
  tagline?: boolean;
}

export default function Brand({ small = false, tagline = true }: BrandProps) {
  return (
    <div className={`brand-lockup ${small ? 'small' : ''}`}>
      <img className="brand-logo" src="/angico-logo-white.png" alt="Angico" />
      {tagline && <span className="logo-tagline">Caderno de impacto</span>}
    </div>
  );
}
