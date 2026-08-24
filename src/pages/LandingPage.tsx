import { Link } from 'react-router-dom';
import { Activity, Shield, Users } from 'lucide-react';
import { useStore } from '../store/useSimulationStore';

export default function LandingPage() {
  const backendConnected = useStore(s => s.backendConnected);

  return (
    <div className="min-h-screen bg-[#07111F] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00D4FF]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#10B981]/5 blur-[120px] rounded-full" />
      </div>

      <div className="z-10 text-center max-w-3xl w-full">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Activity className="w-10 h-10 text-[#00D4FF]" />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-[0.2em]">LIFEGRID</h1>
        </div>
        <p className="text-[#94A3B8] text-lg md:text-xl font-medium tracking-wide mb-12">
          Urban Life-Safety Decision Intelligence
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Authority Access */}
          <div className="bg-[#0D1B2A] border border-[#1C2B3A] p-6 rounded-xl hover:border-[#00D4FF]/50 transition-colors flex flex-col text-left">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-[#00D4FF]" />
              <h2 className="text-xl font-bold tracking-wide">AUTHORITY ACCESS</h2>
            </div>
            <p className="text-[#94A3B8] text-sm mb-6 flex-grow">
              Operational command, cascade intelligence and coordinated response.
            </p>
            <Link 
              to="/login"
              className="block w-full py-3 bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 text-center font-bold tracking-widest text-xs uppercase rounded hover:bg-[#00D4FF]/20 transition-colors"
            >
              AUTHORITY LOGIN
            </Link>
          </div>

          {/* Public Information */}
          <div className="bg-[#0D1B2A] border border-[#1C2B3A] p-6 rounded-xl hover:border-[#10B981]/50 transition-colors flex flex-col text-left">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-[#10B981]" />
              <h2 className="text-xl font-bold tracking-wide">PUBLIC INFORMATION</h2>
            </div>
            <p className="text-[#94A3B8] text-sm mb-6 flex-grow">
              View active public advisories, affected services and recommended actions.
            </p>
            <Link 
              to="/public"
              className="block w-full py-3 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 text-center font-bold tracking-widest text-xs uppercase rounded hover:bg-[#10B981]/20 transition-colors"
            >
              VIEW PUBLIC ADVISORIES
            </Link>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 text-xs font-semibold tracking-widest text-[#64748B] uppercase">
          <span className="w-2 h-2 rounded-full" style={{ background: backendConnected ? '#10B981' : '#F59E0B' }} />
          {backendConnected ? 'LIFEGRID Operational' : 'Local Prototype Mode'}
        </div>
        <div className="mt-4 text-[10px] text-[#64748B]">
          Nagpur geographic prototype • Simulated operational environment
        </div>
      </div>
    </div>
  );
}
