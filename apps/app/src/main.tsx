import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
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

// Progressive Web App: register the service worker in production builds so the
// app shell (and the last-seen território data) keep working offline. Skipped in
// dev so it never caches the Vite module graph / breaks HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is progressive enhancement — ignore registration errors */
    });
  });
}
