import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PublicViewPage from './pages/PublicViewPage';
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
  const location = useLocation();
  
  // Hide on Landing/Login/Public as they have their own or we want a cleaner UI
  if (['/', '/login', '/public'].includes(location.pathname)) return null;

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

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = useStore(s => s.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Layout() {
  const location = useLocation();
  const showNavbar = !['/', '/login', '/public'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#07111F] text-[#E2E8F0] font-sans">
      {showNavbar && <Navbar />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/public" element={<PublicViewPage />} />

        {/* Protected Authority Routes */}
        <Route path="/command-center" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><InfrastructureMapPage /></ProtectedRoute>} />
        <Route path="/simulator" element={<ProtectedRoute><SimulatorPage /></ProtectedRoute>} />
        <Route path="/impact" element={<ProtectedRoute><ImpactAccessibilityPage /></ProtectedRoute>} />
        <Route path="/planner" element={<ProtectedRoute><ResponsePlannerPage /></ProtectedRoute>} />
        <Route path="/recovery" element={<ProtectedRoute><RecoveryPage /></ProtectedRoute>} />
        <Route path="/data-confidence" element={<ProtectedRoute><DataConfidencePage /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute><AuditHistoryPage /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ConnectionIndicator />
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
      <Layout />
    </BrowserRouter>
  );
}

