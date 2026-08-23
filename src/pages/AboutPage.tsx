import { Activity, ShieldAlert, GitMerge, Lock } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-12 space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <Activity className="w-12 h-12 text-[#00D4FF] mx-auto" />
        <h1 className="text-3xl font-extrabold text-white tracking-widest uppercase">LIFEGRID Architecture</h1>
        <p className="text-[#94A3B8] max-w-2xl mx-auto">
          LIFEGRID is a Decision Intelligence prototype designed for municipal emergency operation centers. 
          It operates on a deterministic causal engine rather than stochastic AI, ensuring that every 
          prediction and recommendation is fully explainable and auditable.
        </p>
      </div>

      {/* Core Principles */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6">
          <ShieldAlert className="w-6 h-6 text-amber-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Human Life-Safety First</h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Infrastructure cascades are evaluated primarily by their downstream impact on human populations 
            and emergency accessibility, not just economic or structural damage.
          </p>
        </div>
        
        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6">
          <GitMerge className="w-6 h-6 text-[#00D4FF] mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Deterministic Causal Engine</h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            The system avoids black-box AI. It uses state-machine logic where every failure propagates 
            according to defined rules (capacity, backups, limits) that operators can inspect.
          </p>
        </div>
        
        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6">
          <Lock className="w-6 h-6 text-[#22C55E] mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Fallback-Aware Modeling</h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Dependencies are not strictly binary. LIFEGRID models fallback availability (e.g., hospital backup generators) 
            so a source failure does not instantly doom downstream nodes if backups are present.
          </p>
        </div>

        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6">
          <Activity className="w-6 h-6 text-purple-400 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Evidentiary Telemetry</h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            State assertions are categorized rigidly as OBSERVED (sensor data), INFERRED (logical deduction), 
            or PREDICTED (future cascade). Data confidence controls dropouts.
          </p>
        </div>
      </div>

      <div className="bg-[#07111F] border border-[#1C2B3A] rounded-xl p-6 text-center">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Prototype Notice</h3>
        <p className="text-xs text-[#64748B]">
          Nagpur geographic network derived from OpenStreetMap. Operational states, dependencies 
          and emergency scenarios are simulated for prototype evaluation.
        </p>
      </div>

      {/* Data Sources */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white tracking-wider uppercase text-center">Data Sources</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6">
            <h3 className="text-sm font-bold text-[#22C55E] uppercase tracking-widest mb-3">Geographic Data (Source-Derived)</h3>
            <p className="text-xs text-[#64748B] mb-3">Source: OpenStreetMap — Nagpur prototype area</p>
            <ul className="text-sm text-[#94A3B8] space-y-1.5">
              <li>• Road geometry and connectivity</li>
              <li>• Mapped junction coordinates</li>
              <li>• Mapped hospitals and clinics</li>
              <li>• Mapped emergency and public facilities</li>
              <li>• Mapped power infrastructure (where available)</li>
            </ul>
          </div>
          
          <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6">
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-3">Simulated Prototype Data</h3>
            <p className="text-xs text-[#64748B] mb-3">Source: LIFEGRID_SIMULATION</p>
            <ul className="text-sm text-[#94A3B8] space-y-1.5">
              <li>• Operational conditions and statuses</li>
              <li>• Infrastructure dependencies</li>
              <li>• Traffic loads and capacities</li>
              <li>• Backup runtime and recovery estimates</li>
              <li>• Emergency vehicle states</li>
              <li>• Population exposure estimates</li>
              <li>• Intervention outcomes and recovery sequences</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="text-center text-xs text-[#475569]">
        © OpenStreetMap contributors (ODbL). Simulation zones are not official Nagpur administrative boundaries.
      </div>
    </div>
  );
}
