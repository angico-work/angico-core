import { useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
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
    <main className="app-shell welcome-page">
      <header className="page-header">
        <Brand small />
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="ghost-button" onClick={() => navigate('/login')}>Entrar</button>
          <button className="primary-button" onClick={() => navigate('/app')}>Ver demo</button>
        </nav>
      </header>

      <section className="hero">
        <div>
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
