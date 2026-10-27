const differentiators = [
  {
    title: 'Território com contexto',
    description: 'Localização, pessoas e trabalho permanecem ligados ao registro.'
  },
  {
    title: 'Evidência com autoria',
    description: 'A prova preserva quem registrou, quando e de onde veio.'
  },
  {
    title: 'Rastro sem lacunas ocultas',
    description: 'O Angico mostra o que está conectado e o que ainda falta registrar.'
  }
] as const;

const journey = [
  {
    verb: 'Observar',
    description: 'Registrar o que acontece no lugar.'
  },
  {
    verb: 'Agir',
    description: 'Organizar a resposta e manter responsáveis e recursos ligados.'
  },
  {
    verb: 'Comprovar',
    description: 'Anexar evidência com origem e autoria.'
  },
  {
    verb: 'Continuar',
    description: 'Acompanhar resultados, lacunas e próximos registros.'
  }
] as const;

export default function WhyAngico() {
  return (
    <>
      <section id="unico" className="why-angico site-frame" aria-labelledby="why-title">
        <div className="why-angico__heading">
          <p className="section-label">— Por que é único</p>
          <h2 id="why-title">O resultado nunca aparece sem a sua origem.</h2>
          <p>
            O Angico não separa a mudança das pessoas, do território e da evidência que a
            tornaram possível.
          </p>
        </div>

        <ul className="why-angico__list" aria-label="Diferenciais do Angico">
          {differentiators.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>

        <p className="why-angico__boundary">
          O site demonstra o princípio. O aplicativo autenticado guarda o trabalho.
        </p>
      </section>

      <section id="inteligencia" className="why-angico site-frame" aria-labelledby="intelligence-title">
        <div className="why-angico__heading">
          <p className="section-label">— Inteligência artificial e machine learning</p>
          <h2 id="intelligence-title">O território traz o conhecimento. A IA ajuda a organizar.</h2>
          <p>Menos esforço para classificar relatos, mais tempo para compreender o lugar e agir com a comunidade. O Assistente Angico já dá esse primeiro passo dentro da plataforma.</p>
        </div>
        <ul className="why-angico__list" aria-label="Inteligência no Angico">
          <li>
            <h3>Já no protótipo: classificação assistida</h3>
            <p>Descreva uma observação ou problema e peça uma sugestão de categoria. Um modelo de machine learning identifica o tema e mostra os termos relacionados. Você aceita ou ajusta.</p>
          </li>
          <li>
            <h3>Leve, local e sob seu controle</h3>
            <p>A análise funciona no navegador, inclusive sem conexão, sem enviar o relato a um serviço externo de IA. Nenhuma sugestão altera ou salva um registro sozinha.</p>
          </li>
          <li>
            <h3>Próximos passos de pesquisa</h3>
            <p>Queremos explorar padrões recorrentes e conexões entre registros, com dados autorizados e validação em campo. Previsões de risco e recomendações automáticas ainda não estão disponíveis.</p>
          </li>
        </ul>
        <p className="why-angico__boundary">IA experimental: a versão inicial usa 36 exemplos ilustrativos em português. Pode errar, não foi validada em campo e não substitui a avaliação de quem conhece o território.</p>
      </section>

      <section
        id="como-funciona"
        className="journey site-frame"
        aria-labelledby="journey-title"
      >
        <div className="journey__heading">
          <p className="section-label">— Como funciona</p>
          <h2 id="journey-title">Do primeiro registro ao próximo passo.</h2>
        </div>
        <ol className="journey__list" aria-label="Como o Angico funciona">
          {journey.map((item, index) => (
            <li key={item.verb}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h3>{item.verb}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
