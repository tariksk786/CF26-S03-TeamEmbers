import { useStore } from '../store/useSimulationStore';
import { Play, Activity, CheckCircle2, ShieldAlert, AlertTriangle, FastForward, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RecoveryPage() {
  const { scenario, eventTimeline, currentMetrics, noActionBaseline, approvedInterventionId, clock, advanceClock, actionTickets, verificationResults, reassessmentNeeded, incidents, coordinatedResponses } = useStore();

  const approvedIncident = incidents.find(i => coordinatedResponses[i.id]?.status === 'APPROVED');
  const response = approvedIncident ? coordinatedResponses[approvedIncident.id] : null;

  if (!scenario || (!approvedInterventionId && !approvedIncident)) {
    return <div className="text-white p-6">No approved intervention. Please approve a plan in the Response Planner first.</div>;
  }

  const intv = scenario.interventions?.find(i => i.id === approvedInterventionId);
  const baseline = noActionBaseline || currentMetrics;

  const recoveryEvents = eventTimeline.filter(a => 
    a.type === 'RECOVERY' || 
    a.type === 'INTERVENTION' ||
    (a.type === 'SIMULATED' && a.timestamp.localeCompare('10:00:30') > 0)
  ).reverse();
  
  const isRecovered = currentMetrics.cascadeDepth < 3 && clock > 30 && !reassessmentNeeded;

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Recovery & Verification</h1>
          <p className="text-xs text-[#94A3B8] mt-1">Closed-loop monitoring of action tickets, infrastructure stabilization, and intervention verification.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-[#0D1B2A] border border-[#1C2B3A] rounded-full px-4 py-2 shadow-lg">
          <button onClick={() => advanceClock(1)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors" title="Step +1s">
            <Play className="w-4 h-4" />
          </button>
          <button onClick={() => advanceClock(5)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors" title="Step +5s">
            <FastForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {reassessmentNeeded && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-500">Reassessment Required</h3>
            <p className="text-xs text-[#E2E8F0] mt-1">One or more verification conditions are failing. The implemented actions are not achieving the expected stabilization. LIFEGRID recommends escalating to alternate plans.</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Recovery Timeline */}
        <div className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-6 shadow-xl h-[600px] flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-[#1C2B3A] pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#22C55E]" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Recovery Audit Trail</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-4">
            {recoveryEvents.length === 0 && (
              <div className="text-center text-xs text-[#64748B] italic py-8">No recovery events logged yet.</div>
            )}
            
            {recoveryEvents.map((ev, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 p-3 rounded-lg border ${
                  ev.type === 'INTERVENTION' ? 'bg-[#22C55E]/10 border-[#22C55E]/30' :
                  ev.type === 'RECOVERY' ? 'bg-[#00D4FF]/10 border-[#00D4FF]/30' :
                  'bg-[#07111F]/50 border-[#1C2B3A]'
                }`}
              >
                <div className="w-16 shrink-0 text-right pt-0.5">
                  <span className="text-xs font-mono font-bold text-[#94A3B8]">T+{ev.timestamp.split(':')[2]}s</span>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                  ev.type === 'INTERVENTION' ? 'bg-[#22C55E]' :
                  ev.type === 'RECOVERY' ? 'bg-[#00D4FF]' :
                  'bg-[#64748B]'
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white mb-1">{ev.entity} {ev.status !== 'UNKNOWN' && <span className={ev.type === 'INTERVENTION' ? 'text-[#22C55E] ml-1' : 'text-[#00D4FF] ml-1'}>{ev.status}</span>}</div>
                  <div className="text-sm text-[#E2E8F0]">{ev.desc}</div>
                </div>
              </motion.div>
            ))}

            {isRecovered && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-[#22C55E] mx-auto mb-4" />
                <h3 className="text-2xl font-extrabold text-white tracking-widest uppercase">Cascade Contained</h3>
                <p className="text-[#94A3B8] mt-2">Critical infrastructure has stabilized. Verification conditions met. Entering long-term repair phase.</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Action Tickets & Verification */}
        <div className="space-y-6">
          
          <div className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6 border-b border-[#1C2B3A] pb-4">
              <CheckCircle className="w-5 h-5 text-[#00D4FF]" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Closed-Loop Verification</h2>
            </div>

            {verificationResults.length > 0 ? (
              <div className="space-y-4">
                {verificationResults.map((v, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${v.verified ? 'bg-[#22C55E]/10 border-[#22C55E]/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white uppercase tracking-widest">Target: {v.target}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${v.verified ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-amber-500/15 text-amber-500'}`}>
                        {v.recommendation}
                      </span>
                    </div>
                    <div className="text-sm text-[#E2E8F0]">
                      {v.verified ? 'Target node is OPERATIONAL or RECOVERING.' : 'Target node is still FAILED or DEGRADED.'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#64748B] italic">No verification results available yet. Awaiting action ticket execution.</div>
            )}
          </div>

          <div className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6 border-b border-[#1C2B3A] pb-4">
              <ShieldAlert className="w-5 h-5 text-[#00D4FF]" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Active Action Tickets</h2>
            </div>

            {actionTickets.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {actionTickets.filter(t => t.status !== 'GENERATED' && t.status !== 'ASSIGNED').map(t => (
                  <div key={t.id} className="bg-[#07111F] p-4 rounded-lg border border-[#1C2B3A]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{t.actionDescription}</span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        t.status === 'COMPLETED' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                        t.status === 'VERIFIED' ? 'bg-[#00D4FF]/15 text-[#00D4FF]' :
                        t.status === 'IN_PROGRESS' ? 'bg-amber-500/15 text-amber-500' :
                        'bg-[#1C2B3A] text-[#94A3B8]'
                      }`}>{t.status}</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      {t.responsibleDepartment} • Target: {t.targetAssetName || t.targetAssetId}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#64748B] italic">No active action tickets.</div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
