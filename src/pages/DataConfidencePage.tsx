import { useStore } from '../store/useSimulationStore';
import { Activity, ShieldAlert, WifiOff, Database } from 'lucide-react';

export default function DataConfidencePage() {
  const { telemetryMode, setTelemetryMode } = useStore();

  const modes = [
    { mode: 100 as const, label: 'Optimal Telemetry', desc: 'Full city coverage. High confidence predictions.' },
    { mode: 90 as const, label: 'Minor Degradation (10% Loss)', desc: 'Sensor dropouts in isolated zones. Minor prediction variance.' },
    { mode: 70 as const, label: 'Significant Loss (30% Loss)', desc: 'Major blind spots. Some nodes marked UNKNOWN. Wide prediction ranges.' },
    { mode: 50 as const, label: 'Severe Blackout (50% Loss)', desc: 'Core telemetry failed. System relying heavily on inferred state.' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Database className="w-6 h-6 text-[#00D4FF]" />
          Data Confidence Settings
        </h1>
        <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
          LIFEGRID predictions are constrained by the quality of real-time telemetry. 
          Use this panel to simulate sensor degradation and demonstrate the system's 
          uncertainty-aware fallback mechanisms.
        </p>
      </div>

      <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6 shadow-xl">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-6">Simulate Telemetry Loss</h2>
        
        <div className="space-y-4">
          {modes.map(m => (
            <button
              key={m.mode}
              onClick={() => setTelemetryMode(m.mode)}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${
                telemetryMode === m.mode
                  ? 'bg-[#00D4FF]/10 border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.1)]'
                  : 'bg-[#07111F] border-[#1C2B3A] hover:border-[#2A3A4C]'
              }`}
            >
              <div className={`p-3 rounded-full ${telemetryMode === m.mode ? 'bg-[#00D4FF] text-[#07111F]' : 'bg-[#1C2B3A] text-[#64748B]'}`}>
                {m.mode === 100 ? <Activity className="w-5 h-5" /> : m.mode > 60 ? <ShieldAlert className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className={`text-sm font-bold ${telemetryMode === m.mode ? 'text-[#00D4FF]' : 'text-white'}`}>{m.label}</div>
                <div className="text-xs text-[#94A3B8] mt-1">{m.desc}</div>
              </div>
              <div className="text-2xl font-mono font-bold text-[#1C2B3A]">
                {m.mode}%
              </div>
            </button>
          ))}
        </div>

        {telemetryMode < 100 && (
          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Telemetry Degraded</div>
              <div className="text-xs text-[#E2E8F0] leading-relaxed">
                Recommendations and predictions across LIFEGRID will now display with wider confidence ranges. 
                Certain nodes will drop to <span className="font-mono text-gray-400 bg-gray-800 px-1 rounded">UNKNOWN</span> status, and the engine will rely on Last Known State.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
