import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bricolage-grotesque/latin-800.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
import Site from './Site';
import './styles.css';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Elemento raiz do site não encontrado.');
}

createRoot(root).render(
  <StrictMode>
    <Site
      appUrl={import.meta.env.VITE_APP_URL || ''}
      contactApiUrl={import.meta.env.VITE_CONTACT_API_URL || ''}
    />
  </StrictMode>
);
