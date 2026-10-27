import TerritoryAtlas from './TerritoryAtlas';

export default function TerritoryHero() {
  return (
    <section id="inicio" className="hero" aria-labelledby="hero-title">
      <div className="site-frame h-layout">
        <div className="h-copy">
          <p className="eyebrow">— Memória operacional socioambiental</p>
          <h1 id="hero-title">O trabalho continua. A memória também.</h1>
          <p className="h-summary">
            Inteligência artificial a serviço de quem cuida do território. O Angico conecta
            relatos, pessoas e evidências, com machine learning para ajudar a organizar
            observações e transformar conhecimento local em ação.
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
