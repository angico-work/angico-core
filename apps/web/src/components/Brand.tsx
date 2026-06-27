import logoUrl from '../assets/angico-logo.png';

interface BrandProps {
  small?: boolean;
  tagline?: boolean;
}

export default function Brand({ small = false, tagline = true }: BrandProps) {
  return (
    <div>
      <img className={`logo-img ${small ? 'small' : ''}`} src={logoUrl} alt="Angico" />
      {tagline && <div className="logo-tagline">Memória que transforma</div>}
    </div>
  );
}
