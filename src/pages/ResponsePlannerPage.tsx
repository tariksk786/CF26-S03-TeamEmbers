import { useState } from 'react';
import { useStore } from '../store/useSimulationStore';
import { Zap, CheckCircle2, ShieldAlert, ArrowRight, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Intervention, SimulationMetrics } from '../types';

export default function ResponsePlannerPage() {
  const { scenario, availableResources, allocatedResources, currentMetrics, noActionBaseline, selectIntervention, selectedInterventionId, approveIntervention } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string | null>(scenario?.interventions[0]?.id || null);

  if (!scenario) return <div className="text-white p-6">No scenario active.</div>;

  const baseline = noActionBaseline || currentMetrics; // Fallback to current if baseline not computed yet
  
  const selectedIntv = scenario.interventions.find(i => i.id === activeTab);

  // Check if resources are available (accounting for what is already allocated)
  const isFeasible = (intv: Intervention) => {
    if (!availableResources) return true;
    let feasible = true;
    Object.keys(intv.requiredResources).forEach(key => {
      const k = key as keyof typeof availableResources;
      const netAvail = availableResources[k] - (allocatedResources[k] || 0);
      if (intv.requiredResources[k]! > netAvail) feasible = false;
    });
    return feasible;
  };

  const handleApprove = () => {
    selectIntervention(activeTab);
    approveIntervention();
    navigate('/recovery');
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Response Planner</h1>
          <p className="text-xs text-[#94A3B8] mt-1">Evaluate simulated interventions against doing nothing.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left: Interventions List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] border-b border-[#1C2B3A] pb-2">Candidate Interventions</div>
          
          <button
            onClick={() => setActiveTab(null)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              activeTab === null ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-[#0D1B2A]/70 border-[#1C2B3A] hover:border-[#2A3A4C]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold uppercase tracking-widest ${activeTab === null ? 'text-red-500' : 'text-[#64748B]'}`}>Baseline</span>
            </div>
            <div className="text-sm font-bold text-white mb-1">NO ACTION</div>
            <div className="text-[10px] text-[#94A3B8] leading-snug">Allow the cascade to propagate without intervention.</div>
          </button>

          {scenario.interventions.map((intv) => {
            const active = activeTab === intv.id;
            const feasible = isFeasible(intv);
            return (
              <button key={intv.id} onClick={() => setActiveTab(intv.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  active ? 'bg-[#00D4FF]/10 border-[#00D4FF]/40 shadow-[0_0_15px_rgba(0,212,255,0.1)]' : 'bg-[#0D1B2A]/70 border-[#1C2B3A] hover:border-[#2A3A4C]'
                } ${!feasible && !active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${active ? 'text-[#00D4FF]' : 'text-[#64748B]'}`}>
                    {intv.priority === 1 && <Zap className="w-3 h-3" />}
                    Priority {intv.priority}
                  </span>
                  {!feasible && <span className="text-[9px] font-bold text-red-500 uppercase px-2 py-0.5 bg-red-500/10 rounded border border-red-500/20">Not Feasible</span>}
                </div>
                <div className="text-sm font-bold text-white mb-1">{intv.title}</div>
                <div className="text-[10px] text-[#94A3B8] leading-snug whitespace-pre-wrap">{intv.desc}</div>
                
                {feasible && (
                  <div className="mt-3 flex gap-3 text-[9px] font-mono">
                    <span className="text-[#22C55E]">Impact: -{intv.expectedImpactReductionPct}%</span>
                    <span className="text-amber-500">Feasibility: {intv.operationalFeasibility}%</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Detailed Comparison */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          
          <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6 shadow-xl flex-1">
            <h2 className="text-lg font-bold text-white mb-6">
              {activeTab === null ? 'Baseline: NO ACTION' : `Evaluate: ${selectedIntv?.title}`}
            </h2>

            {/* Metrics Comparison Matrix */}
            <div className="mb-8">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-3">Simulated Prototype Results</div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1C2B3A] text-[10px] uppercase tracking-widest text-[#64748B]">
                    <th className="py-2">Metric</th>
                    <th className="py-2 text-right">No Action</th>
                    <th className="py-2 text-right">{activeTab === null ? '' : 'With Intervention'}</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-mono text-white">
                  <tr className="border-b border-[#1C2B3A]/50">
                    <td className="py-3 text-xs text-[#94A3B8] font-sans">Cascade Depth</td>
                    <td className="py-3 text-right text-red-500">{baseline.cascadeDepth}</td>
                    <td className="py-3 text-right text-[#00D4FF]">{activeTab === null ? '-' : Math.max(0, baseline.cascadeDepth - (selectedIntv?.cascadeReduction || 0))}</td>
                  </tr>
                  <tr className="border-b border-[#1C2B3A]/50">
                    <td className="py-3 text-xs text-[#94A3B8] font-sans">Emergency Delay</td>
                    <td className="py-3 text-right text-red-500">+{baseline.emergencyDelayMin}m</td>
                    <td className="py-3 text-right text-[#00D4FF]">{activeTab === null ? '-' : `+${Math.max(0, baseline.emergencyDelayMin - Math.floor((selectedIntv?.emergencyAccessibilityImprovementPct || 0)/10))}m`}</td>
                  </tr>
                  <tr className="border-b border-[#1C2B3A]/50">
                    <td className="py-3 text-xs text-[#94A3B8] font-sans">Pop. Potentially Affected</td>
                    <td className="py-3 text-right text-red-500">{(baseline.populationAtRisk / 1000).toFixed(1)}k</td>
                    <td className="py-3 text-right text-[#00D4FF]">{activeTab === null ? '-' : ((baseline.populationAtRisk * (1 - (selectedIntv?.expectedImpactReductionPct || 0)/100)) / 1000).toFixed(1)}k</td>
                  </tr>
                  <tr className="border-b border-[#1C2B3A]/50">
                    <td className="py-3 text-xs text-[#94A3B8] font-sans">Recovery Time</td>
                    <td className="py-3 text-right text-red-500">{baseline.recoveryTimeMin}m</td>
                    <td className="py-3 text-right text-[#00D4FF]">{activeTab === null ? '-' : `${Math.max(0, baseline.recoveryTimeMin - (selectedIntv?.recoveryImprovementMin || 0))}m`}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Trade-offs & Resources (Only if an intervention is selected) */}
            {activeTab !== null && selectedIntv && (
              <div className="grid grid-cols-2 gap-6">
                
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Negative Consequences</div>
                  <ul className="space-y-2">
                    {selectedIntv.potentialSideEffects.map((effect, i) => (
                      <li key={i} className="text-xs text-[#E2E8F0] flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{effect}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#00D4FF] mb-2 flex items-center gap-1"><Info className="w-3 h-3"/> Assumptions</div>
                  <ul className="space-y-1">
                    {selectedIntv.assumptions.map((assump, i) => (
                      <li key={i} className="text-[10px] text-[#94A3B8] flex items-start gap-2">
                        <span className="text-[#00D4FF] mt-0.5">-</span>
                        <span>{assump}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#07111F] rounded-lg p-4 border border-[#1C2B3A]">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-3">Resource Requirements</div>
                  <div className="space-y-2 mb-4">
                    {Object.entries(selectedIntv.requiredResources).map(([key, req]) => {
                      const totalAvail = availableResources ? (availableResources as any)[key] : 0;
                      const alloc = allocatedResources ? (allocatedResources as any)[key] : 0;
                      const netAvail = totalAvail - alloc;
                      const hasEnough = netAvail >= (req as number);
                      return (
                        <div key={key} className="flex justify-between items-center text-xs">
                          <span className="text-[#E2E8F0] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="font-mono flex items-center gap-1">
                            {hasEnough ? <CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> : <AlertOctagon className="w-3 h-3 text-red-500" />}
                            <span className={hasEnough ? 'text-[#22C55E]' : 'text-red-500'}>{req as number} <span className="text-[#64748B]">/ {netAvail} avail</span></span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="pt-3 border-t border-[#1C2B3A] grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-[9px] text-[#64748B] uppercase tracking-widest">Setup Time</div>
                      <div className="text-sm font-mono font-bold text-white">{selectedIntv.expectedSetupMin}m</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#64748B] uppercase tracking-widest">Feasibility</div>
                      <div className="text-sm font-mono font-bold text-white">{selectedIntv.operationalFeasibility}%</div>
                    </div>
                  </div>
                </div>

              </div>
            )}
            
          </div>

          {/* Action Footer */}
          <div className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <div className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mb-1">Status</div>
              {activeTab === null ? (
                <div className="text-sm font-bold text-red-500">AWAITING DECISION</div>
              ) : isFeasible(selectedIntv!) ? (
                <div className="text-sm font-bold text-[#22C55E]">PLAN FEASIBLE</div>
              ) : (
                <div className="text-sm font-bold text-red-500">NOT CURRENTLY FEASIBLE</div>
              )}
              <div className="text-[9px] text-[#64748B] mt-1">Decision-support prototype. No direct infrastructure control is performed.</div>
            </div>
            
            <button 
              onClick={handleApprove}
              disabled={activeTab === null || !isFeasible(selectedIntv!)}
              className="flex items-center gap-2 bg-[#00D4FF] text-[#07111F] px-8 py-3 rounded font-bold hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all disabled:opacity-50 disabled:hover:shadow-none"
            >
              {activeTab === 'int-coord' ? 'APPROVE SAFE ROUTE' : 'APPROVE PLAN'} <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
