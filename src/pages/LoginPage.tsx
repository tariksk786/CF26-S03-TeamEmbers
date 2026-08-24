import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useSimulationStore';
import { Activity, Shield, LogIn } from 'lucide-react';
import type { AuthRole } from '../types';

const ROLES: { value: AuthRole; label: string }[] = [
  { value: 'CITY_COMMAND', label: 'City Command' },
  { value: 'TRAFFIC_CONTROL', label: 'Traffic Control' },
  { value: 'WATER_UTILITY', label: 'Water Utility' },
  { value: 'POWER_UTILITY', label: 'Power Utility' },
  { value: 'TELECOM_OPERATIONS', label: 'Telecom Operations' },
  { value: 'EMS', label: 'EMS' },
  { value: 'FIRE_SERVICE', label: 'Fire Service' },
  { value: 'HEALTH_HOSPITAL', label: 'Health / Hospital' },
  { value: 'ADMINISTRATOR', label: 'Administrator' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('demo@lifegrid.local');
  const [password, setPassword] = useState('demo');
  const [role, setRole] = useState<AuthRole>('CITY_COMMAND');
  const [error, setError] = useState('');
  
  const login = useStore(s => s.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter credentials');
      return;
    }

    // In a full implementation, we'd call the backend API here.
    // For this hackathon prototype, we simulate a successful login.
    login({
      id: `auth-${Math.random().toString(36).substr(2, 6)}`,
      email,
      name: `Operator (${ROLES.find(r => r.value === role)?.label})`,
      role,
    });

    // Navigate to the secure command center
    navigate('/command-center');
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[20%] h-[20%] bg-[#00D4FF]/5 blur-[120px] rounded-full" />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Activity className="w-10 h-10 text-[#00D4FF] mb-3" />
          <h1 className="text-2xl font-extrabold tracking-[0.2em]">LIFEGRID</h1>
          <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 rounded text-xs font-bold uppercase tracking-widest">
            <Shield className="w-3 h-3" />
            Prototype Authority Access
          </div>
        </div>

        <form onSubmit={handleLogin} className="bg-[#0D1B2A] border border-[#1C2B3A] p-6 rounded-xl shadow-2xl">
          {error && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-500 p-3 rounded text-sm mb-4">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1.5">
                Operator ID / Email
              </label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#1C2B3A] border border-[#2A3F54] rounded p-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]/50 transition-colors"
                placeholder="demo@lifegrid.local"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#1C2B3A] border border-[#2A3F54] rounded p-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1.5">
                Role (Prototype Override)
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as AuthRole)}
                className="w-full bg-[#1C2B3A] border border-[#2A3F54] rounded p-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]/50 transition-colors appearance-none"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-6 py-3 bg-[#00D4FF] text-[#07111F] rounded font-bold tracking-widest text-xs uppercase hover:bg-[#00B4D8] transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            LOGIN
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/public" className="text-sm text-[#94A3B8] hover:text-[#00D4FF] transition-colors">
            Not an authority? <span className="font-semibold text-white">View Public Advisories →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
