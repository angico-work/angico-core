import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AppShell from './components/AppShell';
import { hasFreshOfflineSession, isAuthenticated } from './lib/api';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const ModulePage = lazy(() => import('./pages/ModulePage'));
const MemoriaPage = lazy(() => import('./pages/MemoriaPage'));
const MensagensPage = lazy(() => import('./pages/MensagensPage'));
const RelatoriosPage = lazy(() => import('./pages/SummaryPages').then((module) => ({
  default: module.RelatoriosPage
})));
const RastroPage = lazy(() => import('./pages/RastroPage'));
const TerritoriosPage = lazy(() => import('./pages/TerritoriosPage'));
const EvidenciasPage = lazy(() => import('./pages/EvidenciasPage'));
const ResultadosPage = lazy(() => import('./pages/ResultadosPage'));
const ImpactoPage = lazy(() => import('./pages/ImpactoPage'));
const RecursosPage = lazy(() => import('./pages/RecursosPage'));
const OrganizacoesPage = lazy(() => import('./pages/OrganizacoesPage'));

function RouteFallback({ label }: { label: string }) {
  return <div className="loading-state" role="status"><span aria-hidden="true" />{label}</div>;
}

function LazyRoute({ label, children }: { label: string; children: ReactNode }) {
  return <Suspense fallback={<RouteFallback label={label} />}>{children}</Suspense>;
}

function EntryRoute() {
  const destination = isAuthenticated() || hasFreshOfflineSession() ? '/app' : '/login';
  return <Navigate to={destination} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<LazyRoute label="Abrindo painel…"><DashboardPage /></LazyRoute>} />
        <Route path="mapa" element={<LazyRoute label="Abrindo mapa…"><MapPage /></LazyRoute>} />
        <Route path="territorios" element={<LazyRoute label="Abrindo territórios…"><TerritoriosPage /></LazyRoute>} />
        <Route path="observacoes" element={<LazyRoute label="Abrindo observações…"><ModulePage configKey="observacoes" /></LazyRoute>} />
        <Route path="problemas" element={<LazyRoute label="Abrindo problemas…"><ModulePage configKey="problemas" /></LazyRoute>} />
        <Route path="missoes" element={<LazyRoute label="Abrindo missões…"><ModulePage configKey="missoes" /></LazyRoute>} />
        <Route path="acoes" element={<LazyRoute label="Abrindo ações…"><ModulePage configKey="acoes" /></LazyRoute>} />
        <Route path="evidencias" element={<LazyRoute label="Abrindo evidências…"><EvidenciasPage /></LazyRoute>} />
        <Route path="resultados" element={<LazyRoute label="Abrindo resultados…"><ResultadosPage /></LazyRoute>} />
        <Route path="recursos" element={<LazyRoute label="Abrindo recursos…"><RecursosPage /></LazyRoute>} />
        <Route path="organizacoes" element={<LazyRoute label="Abrindo organizações…"><OrganizacoesPage /></LazyRoute>} />
        <Route path="potencialidades" element={<LazyRoute label="Abrindo potencialidades…"><ModulePage configKey="potencialidades" /></LazyRoute>} />
        <Route path="pessoas" element={<LazyRoute label="Abrindo pessoas…"><ModulePage configKey="pessoas" /></LazyRoute>} />
        <Route path="mensagens" element={<LazyRoute label="Abrindo conversas…"><MensagensPage /></LazyRoute>} />
        <Route path="indicadores" element={<LazyRoute label="Abrindo indicadores…"><ImpactoPage /></LazyRoute>} />
        <Route path="memoria" element={<LazyRoute label="Abrindo memória…"><MemoriaPage /></LazyRoute>} />
        <Route path="rastro" element={<LazyRoute label="Abrindo o Rastro…"><RastroPage /></LazyRoute>} />
        <Route path="rastro/:rootType/:rootId" element={<LazyRoute label="Abrindo o Rastro…"><RastroPage /></LazyRoute>} />
        <Route path="relatorios" element={<LazyRoute label="Abrindo relatórios…"><RelatoriosPage /></LazyRoute>} />
      </Route>
      <Route path="*" element={<EntryRoute />} />
    </Routes>
  );
}
