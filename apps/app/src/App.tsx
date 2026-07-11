import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import ModulePage from './pages/ModulePage';
import MemoriaPage from './pages/MemoriaPage';
import MensagensPage from './pages/MensagensPage';
import { RelatoriosPage } from './pages/SummaryPages';
import { hasFreshOfflineSession, isAuthenticated } from './lib/api';

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
        <Route index element={<DashboardPage />} />
        <Route path="mapa" element={<MapPage />} />
        <Route path="territorios" element={<LazyRoute label="Abrindo territórios…"><TerritoriosPage /></LazyRoute>} />
        <Route path="observacoes" element={<ModulePage configKey="observacoes" />} />
        <Route path="problemas" element={<ModulePage configKey="problemas" />} />
        <Route path="missoes" element={<ModulePage configKey="missoes" />} />
        <Route path="acoes" element={<ModulePage configKey="acoes" />} />
        <Route path="evidencias" element={<LazyRoute label="Abrindo evidências…"><EvidenciasPage /></LazyRoute>} />
        <Route path="resultados" element={<LazyRoute label="Abrindo resultados…"><ResultadosPage /></LazyRoute>} />
        <Route path="recursos" element={<LazyRoute label="Abrindo recursos…"><RecursosPage /></LazyRoute>} />
        <Route path="organizacoes" element={<LazyRoute label="Abrindo organizações…"><OrganizacoesPage /></LazyRoute>} />
        <Route path="potencialidades" element={<ModulePage configKey="potencialidades" />} />
        <Route path="pessoas" element={<ModulePage configKey="pessoas" />} />
        <Route path="mensagens" element={<MensagensPage />} />
        <Route path="indicadores" element={<LazyRoute label="Abrindo indicadores…"><ImpactoPage /></LazyRoute>} />
        <Route path="memoria" element={<MemoriaPage />} />
        <Route path="rastro" element={<LazyRoute label="Abrindo o Rastro…"><RastroPage /></LazyRoute>} />
        <Route path="rastro/:rootType/:rootId" element={<LazyRoute label="Abrindo o Rastro…"><RastroPage /></LazyRoute>} />
        <Route path="relatorios" element={<RelatoriosPage />} />
      </Route>
      <Route path="*" element={<EntryRoute />} />
    </Routes>
  );
}
