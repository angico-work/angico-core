import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/outfit/latin-500.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-600.css';
import '@fontsource/spline-sans-mono/latin-600.css';
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
