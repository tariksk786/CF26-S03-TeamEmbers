import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import HomePage from './pages/HomePage';
import InfrastructureMapPage from './pages/InfrastructureMapPage';
import SimulatorPage from './pages/SimulatorPage';
import ImpactAccessibilityPage from './pages/ImpactAccessibilityPage';
import ResponsePlannerPage from './pages/ResponsePlannerPage';
import RecoveryPage from './pages/RecoveryPage';
import DataConfidencePage from './pages/DataConfidencePage';
import AuditHistoryPage from './pages/AuditHistoryPage';
import AboutPage from './pages/AboutPage';
import { useStore } from './store/useSimulationStore';

function ConnectionIndicator() {
  const backendConnected = useStore(s => s.backendConnected);
  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border"
      style={{
        background: backendConnected ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
        borderColor: backendConnected ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
        color: backendConnected ? '#10B981' : '#F59E0B'
      }}>
      <span className="w-2 h-2 rounded-full" style={{ background: backendConnected ? '#10B981' : '#F59E0B' }} />
      {backendConnected ? 'Backend Connected' : 'Local Demo Mode'}
    </div>
  );
}

export default function App() {
  const connectBackend = useStore(s => s.connectBackend);

  useEffect(() => {
    connectBackend();
  }, [connectBackend]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#07111F] text-[#E2E8F0] font-sans">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<InfrastructureMapPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/impact" element={<ImpactAccessibilityPage />} />
          <Route path="/planner" element={<ResponsePlannerPage />} />
          <Route path="/recovery" element={<RecoveryPage />} />
          <Route path="/data-confidence" element={<DataConfidencePage />} />
          <Route path="/audit" element={<AuditHistoryPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
        <ConnectionIndicator />
      </div>
    </BrowserRouter>
  );
}

