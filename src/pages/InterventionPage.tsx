import { useStore } from '../store/useSimulationStore';
import { Shield, ArrowRight, CheckCircle, XCircle, AlertTriangle, Zap, Users, Hospital, Clock, TrendingDown, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InterventionPage() {
  const { scenario, recommended, interventionApplied, beforeAfter, impact, applyIntervention } = useStore();

  if (!scenario) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-16 text-center">
        <Shield className="w-12 h-12 text-[#3D5068] mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">No Active Scenario</h2>
        <p className="text-sm text-[#64748B]">Load a scenario from the Cascade Simulator to see intervention options.</p>
      </div>
    );
  }

  const ba = beforeAfter || scenario.beforeAfter;

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Intervention Planner</h1>
        <p className="text-xs text-[#64748B] mt-1">Prioritized response recommendations with impact analysis and What-If comparison.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Interventions */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Ranked Interventions — {scenario.title}</div>
          {scenario.interventions.map((intv, idx) => (
            <motion.div key={intv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              className={`rounded-lg border p-5 relative overflow-hidden ${idx === 0 ? 'bg-[#00D4FF]/5 border-[#00D4FF]/25 shadow-[0_0_20px_rgba(0,212,255,0.08)]' : 'bg-[#0D1B2A]/70 border-[#1C2B3A]'
                }`}
            >
              {idx === 0 && <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D4FF]/5 rounded-full blur-2xl pointer-events-none" />}
              <div className="flex items-center justify-between mb-2 relative">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${idx === 0 ? 'bg-[#00D4FF]/20 text-[#00D4FF]' : 'bg-[#1C2B3A] text-[#64748B]'
                    }`}>Priority {intv.priority}</span>
                  {idx === 0 && <span className="text-[9px] font-bold uppercase tracking-widest text-[#22C55E]">★ Recommended</span>}
                </div>
                <span className="text-xs font-mono font-bold text-[#22C55E]">↓{intv.reductionPct}% impact</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 relative">{intv.title}</h3>
              <p className="text-[11px] text-[#94A3B8] mb-3 leading-relaxed relative">{intv.desc}</p>

              {/* Actions */}
              <div className="space-y-1 mb-3">
                {intv.actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-[#94A3B8]">
                    <CheckCircle className="w-3 h-3 text-[#22C55E] mt-0.5 shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>

              {/* Reasoning */}
              <div className="bg-[#07111F]/50 border border-[#1C2B3A] rounded p-3 mb-3">
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#64748B] mb-1.5">Why this intervention?</div>
                <ol className="space-y-1">
                  {intv.reasoning.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] text-[#94A3B8]">
                      <span className="text-[#64748B] font-mono shrink-0">{i + 1}.</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {idx === 0 && !interventionApplied && (
                <div className="flex gap-2">
                  <button onClick={applyIntervention}
                    className="flex-1 py-2.5 rounded bg-[#00D4FF] text-[#07111F] text-[10px] font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all flex items-center justify-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5" /> Approve & Apply
                  </button>
                  <button className="px-4 py-2.5 rounded border border-[#1C2B3A] text-[#64748B] text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">
                    Modify
                  </button>
                  <button className="px-4 py-2.5 rounded border border-red-500/30 text-red-500/70 text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">
                    Reject
                  </button>
                </div>
              )}
              {interventionApplied && idx === 0 && (
                <div className="flex items-center gap-2 py-2 px-3 rounded bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-xs font-bold">
                  <CheckCircle className="w-4 h-4" /> Intervention Applied — Systems Recovering
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Before vs After */}
        <div className="space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Before vs After Analysis</div>
          <div className="bg-[#0D1B2A]/70 border border-[#1C2B3A] rounded-lg p-5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#64748B] mb-1">Simulated Output — Prototype Data</div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-3 mt-4">
              {/* Header */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-500 text-[10px] font-bold uppercase tracking-widest">
                  <XCircle className="w-3 h-3" /> No Action
                </div>
              </div>
              <div />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[#22C55E] text-[10px] font-bold uppercase tracking-widest">
                  <CheckCircle className="w-3 h-3" /> After Intervention
                </div>
              </div>

              {/* Rows */}
              {[
                { label: 'Citizens at Risk', before: ba.before.citizensAtRisk, after: ba.after.citizensAtRisk, format: true, icon: Users },
                { label: 'Hospitals Affected', before: ba.before.hospitalsAffected, after: ba.after.hospitalsAffected, icon: Hospital },
                { label: 'Emergency Delay', before: ba.before.emergencyDelayMin, after: ba.after.emergencyDelayMin, suffix: ' min', icon: Clock },
                { label: 'Critical Services', before: ba.before.criticalServices, after: ba.after.criticalServices, icon: AlertTriangle },
                { label: 'Cascade Depth', before: ba.before.cascadeDepth, after: ba.after.cascadeDepth, icon: Activity },
                { label: 'Recovery Time', before: ba.before.recoveryMin, after: ba.after.recoveryMin, suffix: ' min', icon: Clock },
                { label: 'Resilience Score', before: ba.before.resilienceScore, after: ba.after.resilienceScore, suffix: '%', icon: Shield },
              ].map(row => {
                const reduction = row.before > 0 ? Math.round((1 - row.after / row.before) * 100) : 0;
                const improved = row.label === 'Resilience Score' ? row.after > row.before : row.after < row.before;
                return (
                  <React.Fragment key={row.label}>
                    <div className="text-center py-2 bg-red-500/5 rounded">
                      <div className="text-lg font-extrabold font-mono text-white">
                        {row.format ? row.before.toLocaleString() : row.before}{row.suffix || ''}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-[#3D5068]" />
                      <span className="text-[9px] text-[#64748B] mt-0.5">{row.label}</span>
                      {improved && <span className="text-[9px] font-bold text-[#22C55E]">↓{Math.abs(reduction)}%</span>}
                    </div>
                    <div className="text-center py-2 bg-[#22C55E]/5 rounded">
                      <div className="text-lg font-extrabold font-mono text-white">
                        {row.format ? row.after.toLocaleString() : row.after}{row.suffix || ''}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Confidence note */}
          <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-lg p-3 text-[11px] text-[#F59E0B] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Simulated prototype data.</strong> Predictions are based on rule-based graph traversal and are presented as risk estimates, not guaranteed outcomes. Human operator approval is required before any real-world action.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
