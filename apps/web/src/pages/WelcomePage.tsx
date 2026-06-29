import { useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import LivingMap from '../components/LivingMap';
import { icon } from '../lib/icons';
import type { IconName } from '../types';

function FlowNode({ title, description, iconName }: { title: string; description: string; iconName: IconName }) {
  return (
    <div className="flow-node">
      <div className="flow-icon">{icon(iconName)}</div>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}

function Challenge({ title, description, iconName }: { title: string; description: string; iconName: IconName }) {
  return (
    <article className="challenge-card">
      <div className="challenge-icon">{icon(iconName)}</div>
      <b>{title}</b>
      <p>{description}</p>
    </article>
  );
}

function Capability({ title, description }: { title: string; description: string }) {
  return (
    <article className="capability-card">
      <span className="eyebrow">{icon('check')} Angico core</span>
      <b>{title}</b>
      <p>{description}</p>
    </article>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <main className="welcome-page">
      <div className="hero-shell dusk-scene">
        <header className="page-header">
          <Brand small />
          <nav className="welcome-nav">
            <button className="ghost-button" onClick={() => navigate('/login')}>Entrar</button>
            <button className="primary-button" onClick={() => navigate('/app')}>Ver demo</button>
          </nav>
        </header>

        <section className="hero">
          <div className="hero-copy-col">
            <span className="eyebrow">{icon('sprout')} Inteligência socioambiental para territórios</span>
            <h1>Onde o território <span>aprende</span> a agir e lembrar.</h1>
            <p className="hero-copy">
              O Angico conecta observações, evidências, problemas, pessoas, missões, ações e indicadores em uma memória viva do território. Ele transforma relatos dispersos em continuidade operacional para comunidades, jovens e organizações.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => navigate('/login')}>Começar agora</button>
              <button className="secondary-button" onClick={() => navigate('/app')}>Abrir primeira visão</button>
            </div>
            <div className="hero-proof">
              <div className="proof-pill">{icon('observation')} Observações viram evidências</div>
              <div className="proof-pill">{icon('mission')} Problemas viram missões</div>
              <div className="proof-pill">{icon('memory')} Impacto vira memória</div>
            </div>
          </div>

          <div className="hero-panel">
            <div className="memory-card large">
              <span className="eyebrow">Core ontológico</span>
              <h3>Do registro ao impacto</h3>
              <p>O mapa é apenas uma projeção. O núcleo do Angico guarda objetos, relações e eventos rastreáveis.</p>
              <div className="memory-flow">
                <FlowNode title="Observação" description="Jovem registra o que acontece no território." iconName="observation" />
                <FlowNode title="Evidência" description="Foto, relato ou medição comprova o registro." iconName="target" />
                <FlowNode title="Problema" description="A situação é validada e priorizada." iconName="warning" />
                <FlowNode title="Missão" description="Pessoas, parceiros e recursos são mobilizados." iconName="mission" />
                <FlowNode title="Impacto" description="Resultados são medidos e ficam na memória." iconName="indicator" />
              </div>
            </div>
            <div className="trace-card">
              <span>Rastro operacional</span>
              <strong>Problema → Missão → Ação → Resultado</strong>
              <p>Cada número pode voltar à evidência original.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="welcome-section problem-section">
        <div className="section-head">
          <span className="section-kicker">{icon('warning')} O desafio</span>
          <h2>O que se perde quando o território não tem memória.</h2>
          <p>
            Desmatamento, queimadas, descarte irregular, perda de biodiversidade: muitas ocorrências
            socioambientais acontecem longe de qualquer registro estruturado. Quando viram dado, estão
            dispersas — em cadernos, grupos de mensagem e planilhas que ninguém reencontra. Sem memória,
            cada resposta recomeça do zero.
          </p>
        </div>
        <div className="challenge-grid">
          <Challenge iconName="tree" title="Desmatamento e degradação" description="Áreas que mudam sem que ninguém acompanhe a perda ao longo do tempo." />
          <Challenge iconName="warning" title="Queimadas recorrentes" description="Focos que se repetem nos mesmos lugares, ano após ano, sem histórico consolidado." />
          <Challenge iconName="trash" title="Resíduos e descarte irregular" description="Pontos de descarte que reaparecem porque a ocorrência nunca virou ação." />
          <Challenge iconName="leaf" title="Perda de biodiversidade" description="Espécies e ecossistemas pressionados sem um registro vivo do que existe — e do que sumiu." />
          <Challenge iconName="map" title="Ocorrências sem mapa" description="Relatos sem lugar, data ou evidência são impossíveis de priorizar e acompanhar." />
          <Challenge iconName="people" title="Comunidade fora da decisão" description="Quem vive o território observa tudo, mas raramente participa de onde as escolhas acontecem." />
        </div>
      </section>

      <section className="welcome-section response-section">
        <div className="response-grid">
          <div className="response-copy">
            <span className="section-kicker">{icon('sprout')} A resposta do Angico</span>
            <h2>Cada registro encontra seu lugar — e fica.</h2>
            <p>
              O Angico recebe o que a comunidade observa, ancora cada ocorrência em um endereço e em
              coordenadas reais, e conecta observações, problemas e potencialidades em uma só memória do
              território. O mapa deixa de ser uma foto e passa a ser um sistema vivo: cada ponto carrega
              sua evidência, sua autoria e sua história.
            </p>
            <ul className="response-list">
              <li>{icon('observation')} Observações viram pontos no mapa, com endereço e coordenada.</li>
              <li>{icon('target')} Cada ponto guarda evidência, categoria e quem registrou.</li>
              <li>{icon('memory')} O histórico permanece: o território lembra o que já viveu.</li>
            </ul>
          </div>
          <LivingMap />
        </div>
      </section>

      <section className="welcome-section">
        <div className="section-head">
          <h2>Mais do que mapear problemas.</h2>
          <p>O Angico organiza o conhecimento local, fortalece comunidades e cria uma memória permanente de desafios, recursos, respostas e conquistas.</p>
        </div>
        <div className="capability-grid">
          <Capability title="Ontologia socioambiental" description="Territórios, pessoas, evidências, problemas, potencialidades, missões, ações e indicadores funcionam como objetos conectados." />
          <Capability title="Histórico de ações" description="Cada evento relevante é registrado em uma timeline operacional, preservando autoria, origem, versão e impacto." />
          <Capability title="Ação coletiva" description="Jovens e moradores deixam de ser apenas fontes de dados e passam a operar como agentes de inteligência territorial." />
        </div>
      </section>

      <section className="dusk-band dusk-scene">
        <img className="leaf-mark" src="/angico-leaf.png" alt="" aria-hidden="true" />
        <div>
          <h2>A memória do território começa com um registro.</h2>
          <p>Entre no workspace da sua comunidade e transforme o que se observa em ação coordenada — e em memória que permanece.</p>
        </div>
        <div className="dusk-band-cta">
          <button type="button" className="primary-button" onClick={() => navigate('/login')}>Entrar no território</button>
          <button type="button" className="ghost-button" onClick={() => navigate('/app')}>Ver demonstração</button>
        </div>
      </section>
    </main>
  );
}
