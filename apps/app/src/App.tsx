import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import ModulePage from './pages/ModulePage';
import MemoriaPage from './pages/MemoriaPage';
import MensagensPage from './pages/MensagensPage';
import { IndicadoresPage, RelatoriosPage } from './pages/SummaryPages';
import { hasFreshOfflineSession, isAuthenticated } from './lib/api';

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
        <Route path="observacoes" element={<ModulePage configKey="observacoes" />} />
        <Route path="problemas" element={<ModulePage configKey="problemas" />} />
        <Route path="missoes" element={<ModulePage configKey="missoes" />} />
        <Route path="acoes" element={<ModulePage configKey="acoes" />} />
        <Route path="potencialidades" element={<ModulePage configKey="potencialidades" />} />
        <Route path="pessoas" element={<ModulePage configKey="pessoas" />} />
        <Route path="mensagens" element={<MensagensPage />} />
        <Route path="indicadores" element={<IndicadoresPage />} />
        <Route path="memoria" element={<MemoriaPage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
      </Route>
      <Route path="*" element={<EntryRoute />} />
    </Routes>
  );
}
