import TerritoryStoryMap from './TerritoryStoryMap';

export default function TerritoryHero() {
  return (
    <section id="inicio" className="territory-hero" aria-labelledby="hero-title">
      <div className="site-frame territory-hero__content">
        <div className="territory-hero__copy">
          <p className="eyebrow">— Memória operacional socioambiental</p>
          <h1 id="hero-title">O trabalho continua. A memória também.</h1>
          <p className="territory-hero__summary">
            O Angico conecta território, autoria, evidência e resultado para que uma ação possa
            ser retomada, compreendida e demonstrada ao longo do tempo.
          </p>
          <a className="primary-action" href="#contato">
            Quero levar o Angico ao meu território
          </a>
        </div>
      </div>

      <div className="territory-hero__map">
        <TerritoryStoryMap />
      </div>
    </section>
  );
}
