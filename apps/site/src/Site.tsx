import AnimatedLeafFooter from './components/AnimatedLeafFooter';
import ContactSection from './components/ContactSection';
import EnvironmentalContext from './components/EnvironmentalContext';
import TerritoryHero from './components/TerritoryHero';
import WhyAngico from './components/WhyAngico';

export interface SiteProps {
  appUrl: string;
  contactApiUrl: string;
}

export default function Site({ appUrl, contactApiUrl }: SiteProps) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className="site-header">
        <div className="site-frame header-inner">
          <a className="wordmark" href="#inicio" aria-label="Angico, início">
            <span className="wordmark-image" aria-hidden="true" />
          </a>

          <nav aria-label="Navegação principal">
            <a href="#unico">Por que é único</a>
            <a href="#como-funciona">Como funciona</a>
            {appUrl ? (
              <a className="header-access" href={appUrl}>
                Já sou membro
              </a>
            ) : (
              <span className="header-access header-access--unavailable">
                Acesso de membros indisponível
              </span>
            )}
          </nav>
        </div>
      </header>

      <main id="conteudo">
        <TerritoryHero />
        <EnvironmentalContext />
        <WhyAngico />
        <ContactSection contactApiUrl={contactApiUrl} />
      </main>

      <AnimatedLeafFooter />
    </div>
  );
}
