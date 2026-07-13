import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/bricolage-grotesque/latin-800.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
import App from './App';
import './styles.css';

const container = document.querySelector('#app');
if (!container) {
  throw new Error('Elemento raiz #app não encontrado.');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
