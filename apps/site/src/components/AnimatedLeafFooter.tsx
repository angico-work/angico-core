export default function AnimatedLeafFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-leaf-stage" aria-hidden="true">
        <span className="footer-leaf" aria-hidden="true" />
      </div>
      <div className="site-frame footer-inner">
        <a className="footer-wordmark" href="#inicio" aria-label="Angico, voltar ao início">
          <img src="/angico-logo-white.png" alt="" />
        </a>
        <p>Memória coletiva para ações que precisam continuar.</p>
        <a href="#conteudo">Voltar ao início</a>
      </div>
    </footer>
  );
}
