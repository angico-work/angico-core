import TerritoryAtlas from './TerritoryAtlas';

export default function TerritoryHero() {
  return (
    <section id="inicio" className="hero" aria-labelledby="hero-title">
      <div className="site-frame h-layout">
        <div className="h-copy">
          <p className="eyebrow">— Memória operacional socioambiental</p>
          <h1 id="hero-title">O trabalho continua. A memória também.</h1>
          <p className="h-summary">
            O Angico conecta território, autoria, evidência e resultado para que uma ação possa
            ser retomada, compreendida e demonstrada ao longo do tempo.
          </p>
          <a className="primary-action" href="#contato">
            Quero levar o Angico ao meu território
          </a>
        </div>

        <TerritoryAtlas />
      </div>
    </section>
  );
}
