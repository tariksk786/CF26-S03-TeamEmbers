import { useStore } from '../store/useSimulationStore';
import { Play, Pause, Activity, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RecoveryPage() {
  const { scenario, eventTimeline, currentMetrics, noActionBaseline, approvedInterventionId, clock, advanceClock, isPlaying, togglePlay } = useStore();

  if (!scenario || !approvedInterventionId) {
    return <div className="text-white p-6">No approved intervention. Please approve a plan in the Response Planner first.</div>;
  }

  const intv = scenario.interventions.find(i => i.id === approvedInterventionId);
  const baseline = noActionBaseline || currentMetrics;

  // Show events that happen during recovery phase (clock > intervention approval)
  // For the demo, let's just show events after T+30s or those explicitly marked RECOVERY
  const recoveryEvents = eventTimeline.filter(a => 
    a.type === 'RECOVERY' || 
    (a.type === 'SIMULATED' && a.timestamp.localeCompare('10:00:30') > 0)
  );
  
  const isRecovered = currentMetrics.cascadeDepth < 3 && clock > 30;

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Recovery Simulation</h1>
          <p className="text-xs text-[#94A3B8] mt-1">Monitoring infrastructure stabilization and cascading recovery effects.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[#0D1B2A] border border-[#1C2B3A] rounded-full px-4 py-2">
          <button onClick={() => advanceClock(5)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors" title="Step +5s">
            <Play className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Recovery Timeline */}
        <div className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-6 shadow-xl h-[600px] flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-[#1C2B3A] pb-4">
            <Activity className="w-5 h-5 text-[#22C55E]" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Recovery Timeline</h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-4">
            <div className="flex gap-4 p-3 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30">
              <div className="w-16 shrink-0 text-right pt-0.5">
                <span className="text-xs font-mono font-bold text-[#22C55E]">T+0s</span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-[#22C55E] shadow-[0_0_8px_#22C55E]" />
              <div className="flex-1">
                <div className="text-sm text-white font-bold mb-1">Plan Approved: {intv?.title}</div>
                <div className="text-xs text-[#E2E8F0]">Commencing resource deployment and operational setup.</div>
              </div>
            </div>

            {recoveryEvents.map((ev, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 p-3 rounded-lg bg-[#07111F]/50 border border-[#1C2B3A]"
              >
                <div className="w-16 shrink-0 text-right pt-0.5">
                  <span className="text-xs font-mono font-bold text-[#94A3B8]">T+{ev.timestamp.split(':')[2]}s</span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-[#00D4FF]" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white mb-1">{ev.entity} {ev.status !== 'UNKNOWN' && <span className="text-[#00D4FF] ml-1">{ev.status}</span>}</div>
                  <div className="text-sm text-[#E2E8F0]">{ev.desc}</div>
                </div>
              </motion.div>
            ))}

            {isRecovered && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-[#22C55E] mx-auto mb-4" />
                <h3 className="text-2xl font-extrabold text-white tracking-widest uppercase">Cascade Contained</h3>
                <p className="text-[#94A3B8] mt-2">Critical infrastructure has stabilized. Entering long-term repair phase.</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Evaluation Summary */}
        <div className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-6 border-b border-[#1C2B3A] pb-4">
            <ShieldAlert className="w-5 h-5 text-[#00D4FF]" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Evaluation Summary</h2>
          </div>

          <div className="text-[10px] font-bold text-center text-[#64748B] uppercase tracking-widest mb-6">
            Simulated Prototype Results — Not Real-World Performance Claims
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-5">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest text-center mb-6">NO ACTION</h3>
              <div className="space-y-4 text-sm font-mono text-white">
                <div className="flex justify-between border-b border-[#1C2B3A] pb-1">
                  <span className="text-xs text-[#94A3B8] font-sans">Cascade Depth</span>
                  <span className="text-red-500 font-bold">{baseline.cascadeDepth}</span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-1">
                  <span className="text-xs text-[#94A3B8] font-sans">Emergency Delay</span>
                  <span className="text-red-500 font-bold">{baseline.emergencyDelayMin} min</span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-1">
                  <span className="text-xs text-[#94A3B8] font-sans">Risk Score</span>
                  <span className="text-red-500 font-bold">{baseline.riskScore}/100</span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-1">
                  <span className="text-xs text-[#94A3B8] font-sans">Critical Facilities</span>
                  <span className="text-red-500 font-bold">{baseline.criticalFacilitiesAffected}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#00D4FF]/5 border border-[#00D4FF]/30 rounded-lg p-5 shadow-[0_0_20px_rgba(0,212,255,0.1)] relative">
              <h3 className="text-xs font-bold text-[#00D4FF] uppercase tracking-widest text-center mb-6">LIFEGRID RESPONSE</h3>
              <div className="space-y-4 text-sm font-mono text-white">
                <div className="flex justify-between border-b border-[#1C2B3A] pb-1">
                  <span className="text-xs text-[#94A3B8] font-sans">Cascade Depth</span>
                  <span className="text-[#22C55E] font-bold flex items-center gap-2">
                    {Math.max(0, baseline.cascadeDepth - (intv?.cascadeReduction || 0))}
                    <span className="text-[10px] text-[#22C55E] bg-[#22C55E]/10 px-1 rounded">-{intv?.cascadeReduction || 0}</span>
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-1">
                  <span className="text-xs text-[#94A3B8] font-sans">Emergency Delay</span>
                  <span className="text-[#22C55E] font-bold flex items-center gap-2">
                    {Math.max(0, baseline.emergencyDelayMin - Math.floor((intv?.emergencyAccessibilityImprovementPct || 0)/10))} min
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-1">
                  <span className="text-xs text-[#94A3B8] font-sans">Risk Score</span>
                  <span className="text-[#22C55E] font-bold flex items-center gap-2">
                    {Math.max(0, baseline.riskScore - Math.floor((intv?.expectedImpactReductionPct || 0)/2))}/100
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-1">
                  <span className="text-xs text-[#94A3B8] font-sans">Critical Facilities</span>
                  <span className="text-[#22C55E] font-bold">
                    {Math.max(0, baseline.criticalFacilitiesAffected - 1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#07111F] border border-[#1C2B3A] rounded-lg p-4">
            <h4 className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest mb-2">Resource Utilization</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(intv?.requiredResources || {}).map(([k, v]) => (
                <div key={k} className="px-2 py-1 bg-[#1C2B3A] rounded text-[10px] text-[#E2E8F0] font-mono">
                  {v}x {k.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
