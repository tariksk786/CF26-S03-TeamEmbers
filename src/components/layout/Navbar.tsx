import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useSimulationStore';
import { Activity, Bell, Settings, User, ShieldAlert, Menu, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { to: '/', label: 'Command Center' },
  { to: '/map', label: 'Infrastructure Map' },
  { to: '/simulator', label: 'Cascade Simulator' },
  { to: '/impact', label: 'Impact & Accessibility' },
  { to: '/planner', label: 'Response Planner' },
  { to: '/recovery', label: 'Recovery' },
];

const moreLinks = [
  { to: '/data-confidence', label: 'Data Confidence' },
  { to: '/audit', label: 'Audit History' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const location = useLocation();
  const { clockLabel, currentMetrics, scenario } = useStore();
  const isEmergency = currentMetrics.populationAtRisk > 0;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0D1B2A]/95 backdrop-blur-md border-b border-[#1C2B3A]">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Activity className="w-5 h-5 text-[#00D4FF]" />
          <span className="text-base font-extrabold tracking-[0.15em] text-white">LIFEGRID</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-6">
          {navLinks.map(l => (
            <Link
              key={l.to} to={l.to}
              className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors ${
                location.pathname === l.to
                  ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1C2B3A]'
              }`}
            >
              {l.label}
            </Link>
          ))}

          {/* More Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setMoreOpen(!moreOpen)}
              onBlur={() => setTimeout(() => setMoreOpen(false), 200)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors ${
                moreLinks.some(l => l.to === location.pathname)
                  ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1C2B3A]'
              }`}
            >
              More <ChevronDown className="w-3 h-3" />
            </button>
            {moreOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-[#0D1B2A] border border-[#1C2B3A] rounded shadow-xl py-1">
                {moreLinks.map(l => (
                  <Link
                    key={l.to} to={l.to}
                    className={`block px-4 py-2 text-xs font-semibold transition-colors ${
                      location.pathname === l.to ? 'bg-[#00D4FF]/15 text-[#00D4FF]' : 'text-[#94A3B8] hover:text-white hover:bg-[#1C2B3A]'
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Status & Clock */}
        <div className="hidden md:flex items-center gap-6 ml-auto mr-4">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
            isEmergency
              ? 'bg-red-500/15 text-red-500 border border-red-500/40'
              : 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30'
          }`}>
            {isEmergency && <ShieldAlert className="w-3 h-3" />}
            {isEmergency ? 'Emergency' : 'Operational'}
          </div>
          <div className="text-center">
            <div className="text-[9px] text-[#64748B] uppercase tracking-widest">Simulation Time</div>
            <div className="text-sm font-mono font-bold text-white">{clockLabel}</div>
          </div>
          {scenario && (
            <div className="text-center">
              <div className="text-[9px] text-[#64748B] uppercase tracking-widest">Scenario</div>
              <div className="text-xs font-semibold text-[#00D4FF] max-w-[120px] truncate">{scenario.name}</div>
            </div>
          )}
        </div>

        {/* Right icons */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-[#1C2B3A]">
            <User className="w-4 h-4 text-[#94A3B8]" />
            <div>
              <div className="text-xs font-semibold text-white leading-none">Operator</div>
              <div className="text-[9px] text-[#64748B]">Auth Alpha</div>
            </div>
          </div>
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#0D1B2A] border-t border-[#1C2B3A] px-4 py-3 space-y-1">
          {[...navLinks, ...moreLinks].map(l => (
            <Link
              key={l.to} to={l.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded text-sm font-medium ${
                location.pathname === l.to ? 'bg-[#00D4FF]/15 text-[#00D4FF]' : 'text-[#94A3B8]'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
