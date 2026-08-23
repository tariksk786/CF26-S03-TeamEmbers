import { useStore } from '../store/useSimulationStore';
import { Users, Hospital, Clock, MapPin, ShieldAlert, Navigation, Car, AlertOctagon, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ImpactAccessibilityPage() {
  const { currentMetrics, nodes, vehicles, scenario } = useStore();

  // Use Life-Safety Score from centralized metrics
  const lifeSafetyScore = currentMetrics.lifeSafetyImpactScore;
  const lifeSafetyLevel = lifeSafetyScore > 70 ? 'CRITICAL' : lifeSafetyScore > 40 ? 'HIGH' : lifeSafetyScore > 20 ? 'MODERATE' : 'LOW IMPACT';
  const lifeSafetyColor = lifeSafetyScore > 70 ? '#EF4444' : lifeSafetyScore > 40 ? '#F59E0B' : lifeSafetyScore > 20 ? '#A855F7' : '#22C55E';
  
  const emergencyAccessibilityPct = Math.max(0, 100 - (currentMetrics.emergencyDelayMin * 4));

  // Zone Breakdown
  const zones = new Map<string, { total: number; affected: number; pop: number }>();
  Object.values(nodes).forEach(n => {
    const z = zones.get(n.zone) || { total: 0, affected: 0, pop: 0 };
    z.total++;
    z.pop += n.populationServed;
    if (n.status === 'FAILED' || n.status === 'DEGRADED' || n.status === 'PREDICTED_RISK') z.affected++;
    zones.set(n.zone, z);
  });
  
  const riskZones = Array.from(zones.entries())
    .map(([name, v]) => ({ name, pop: v.pop, affected: v.affected, total: v.total, risk: v.affected / v.total }))
    .sort((a, b) => b.risk - a.risk);

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Impact & Accessibility</h1>
        <p className="text-xs text-[#94A3B8] mt-1">Human life-safety impact, affected population, and emergency vehicle accessibility.</p>
      </div>

      {/* Top Scores */}
      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Main Score */}
        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-2">Life-Safety Impact Score</div>
          <div className="text-5xl font-extrabold font-mono mb-2" style={{ color: lifeSafetyColor }}>
            {lifeSafetyScore} <span className="text-lg text-[#64748B]">/ 100</span>
          </div>
          <div className="px-3 py-1 rounded font-bold uppercase tracking-widest text-[10px]" style={{ background: `${lifeSafetyColor}20`, color: lifeSafetyColor }}>
            {lifeSafetyLevel}
          </div>
          <p className="text-[9px] text-[#64748B] mt-4">0 = Normal Baseline. 100 = Maximum Critical Impact.</p>
        </div>

        {/* KPIs */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Population Exposed', val: currentMetrics.populationExposed > 0 ? `${(currentMetrics.populationExposed/1000).toFixed(1)}k` : '0', icon: Users, color: currentMetrics.populationExposed > 0 ? 'text-amber-500' : 'text-[#22C55E]' },
            { label: 'Emergency Delay', val: `+${currentMetrics.emergencyDelayMin} min`, icon: Clock, color: currentMetrics.emergencyDelayMin > 10 ? 'text-red-500' : currentMetrics.emergencyDelayMin > 0 ? 'text-amber-500' : 'text-[#22C55E]' },
            { label: 'Facilities Exposed', val: currentMetrics.criticalFacilitiesAffected, icon: Hospital, color: currentMetrics.criticalFacilitiesAffected > 0 ? 'text-red-500' : 'text-[#22C55E]' },
            { label: 'Resilience Score', val: `${currentMetrics.resilienceScore}%`, icon: ShieldAlert, color: currentMetrics.resilienceScore < 50 ? 'text-red-500' : currentMetrics.resilienceScore < 80 ? 'text-amber-500' : 'text-[#22C55E]' },
          ].map((k, i) => (
            <div key={i} className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <k.icon className={`w-4 h-4 ${k.color}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">{k.label}</span>
              </div>
              <div className={`text-2xl font-bold font-mono ${k.color}`}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Highest-Risk Zones */}
        <section className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5 text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Highest-Risk Zones</h2>
          </div>
          <div className="space-y-4">
            {riskZones.map((z, i) => (
              <div key={z.name} className="bg-[#07111F] border border-[#1C2B3A] rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-[#64748B] font-mono">{i + 1}.</span> {z.name}
                  </h3>
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                    z.risk > 0.5 ? 'bg-red-500/20 text-red-500' : z.risk > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-[#22C55E]/20 text-[#22C55E]'
                  }`}>
                    {z.risk > 0.5 ? 'CRITICAL' : z.risk > 0 ? 'HIGH' : 'LOW RISK'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Pop. Potentially Affected</div>
                    <div className="text-sm font-mono text-white">{z.pop > 0 && z.risk > 0 ? (z.pop * z.risk).toLocaleString() : '0'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Hospital Access</div>
                    <div className={`text-sm font-bold ${z.risk > 0.5 ? 'text-red-500' : z.risk > 0 ? 'text-amber-500' : 'text-[#22C55E]'}`}>
                      {z.risk > 0.5 ? 'Severely Degraded' : z.risk > 0 ? 'Degraded' : 'Normal'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">P1 Ambulances Affected</div>
                    <div className="text-sm font-mono text-white">{z.risk > 0.5 ? 2 : 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Alternative Routes</div>
                    <div className="text-sm font-bold text-amber-500">{z.risk > 0.5 ? 1 : 2}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Emergency Accessibility */}
        <section className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Navigation className="w-5 h-5 text-[#00D4FF]" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Emergency Accessibility</h2>
          </div>
          
          <div className="space-y-4">
            {/* Example Zone Accessibility Detail */}
            <div className="bg-[#07111F] border border-[#1C2B3A] rounded-lg p-4">
              <h3 className="text-xs font-bold text-[#00D4FF] mb-3 uppercase tracking-widest">Medical District</h3>
              <div className="grid grid-cols-2 gap-y-3">
                <div className="flex justify-between border-b border-[#1C2B3A] pb-2 pr-4">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Nearest Hospital</span>
                  <span className="text-xs font-bold text-white">H-01</span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-2">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Normal ETA</span>
                  <span className="text-xs font-mono text-white">8 min</span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-2 pr-4">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Current ETA</span>
                  <span className={`text-xs font-mono font-bold ${currentMetrics.emergencyDelayMin > 0 ? 'text-red-500' : 'text-[#22C55E]'}`}>{8 + currentMetrics.emergencyDelayMin} min</span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-2">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Delay</span>
                  <span className={`text-xs font-mono font-bold ${currentMetrics.emergencyDelayMin > 0 ? 'text-red-500' : 'text-[#22C55E]'}`}>+{currentMetrics.emergencyDelayMin} min</span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-2 pr-4">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Alternative Route</span>
                  <span className="text-xs font-bold text-amber-500">Available</span>
                </div>
                <div className="flex justify-between border-b border-[#1C2B3A] pb-2">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Accessibility Score</span>
                  <span className="text-xs font-mono font-bold text-amber-500">{emergencyAccessibilityPct}%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Emergency Vehicles & Conflict Resolution */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        <section className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-white" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Emergency Vehicles</h2>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-[#64748B] bg-[#07111F] px-2 py-1 rounded border border-[#1C2B3A]">
              <Info className="w-3 h-3" />
              <span>Medical priority supplied by external EMS.</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1C2B3A] text-[10px] uppercase tracking-widest text-[#64748B]">
                  <th className="py-3 font-bold">Vehicle</th>
                  <th className="py-3 font-bold">Priority</th>
                  <th className="py-3 font-bold">Delay</th>
                  <th className="py-3 font-bold">Route State</th>
                  <th className="py-3 font-bold">Intervention Need</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {vehicles.map(v => (
                  <tr key={v.id} className="border-b border-[#1C2B3A]/50">
                    <td className="py-3 font-mono font-bold text-white">{v.id}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded font-bold ${v.priority === 'P1' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>{v.priority}</span>
                    </td>
                    <td className="py-3 font-mono text-[#E2E8F0]">{v.id === 'A-102' ? `+${currentMetrics.emergencyDelayMin} min` : '+1 min'}</td>
                    <td className="py-3 text-[#94A3B8]">{currentMetrics.emergencyDelayMin > 5 && v.id === 'A-102' ? 'Severe Congestion' : 'Clear'}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${
                        currentMetrics.emergencyDelayMin > 5 && v.id === 'A-102' ? 'bg-red-500/20 text-red-500' : 'bg-[#22C55E]/20 text-[#22C55E]'
                      }`}>
                        {currentMetrics.emergencyDelayMin > 5 && v.id === 'A-102' ? 'Critical' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[#64748B] mt-4 italic text-center">
            * LIFEGRID calculates infrastructure intervention priority only. It does not diagnose patients.
          </p>
        </section>

        <section className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertOctagon className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Ambulance Accessibility</h2>
          </div>
          
          {vehicles.map(v => {
            if (v.routeState === 'CLEAR') return null; // Only show blocked/degraded vehicles in detail
            
            return (
              <div key={v.id} className="space-y-4 mb-6 last:mb-0">
                <div className="flex justify-between items-end border-b border-[#1C2B3A] pb-2">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-widest">Ambulance</div>
                    <div className="text-lg font-bold text-white">{v.id}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-widest">Destination</div>
                    <div className="text-sm font-bold text-white">{v.targetNodeId === 'HO-01' ? 'Hospital H-01' : v.targetNodeId}</div>
                  </div>
                </div>

                <div className="bg-[#07111F] border border-red-500/30 rounded-lg p-4">
                  <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-widest mb-2">Current Route</div>
                  <div className="text-sm font-mono text-white mb-4">
                    {v.currentRoute?.join(' → ') || 'Unknown'}
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <div className="px-2 py-1 bg-red-500/20 text-red-500 text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> BLOCKED
                    </div>
                    <div className="text-xs font-mono text-red-500 font-bold">Current ETA: {v.currentETA} min</div>
                  </div>
                  
                  <div className="text-xs text-[#94A3B8]">
                    <span className="font-bold text-white">Reason:</span> {v.rerouteReason || 'Route infrastructure failure detected.'}
                  </div>
                </div>

                {v.recommendedRoute && v.approvalStatus === 'PENDING' && (
                  <div className="bg-[#00D4FF]/5 border border-[#00D4FF]/30 rounded-lg p-4 shadow-[0_0_15px_rgba(0,212,255,0.1)] relative">
                    <div className="absolute top-0 right-0 px-2 py-1 bg-[#00D4FF] text-[#07111F] text-[9px] font-bold uppercase tracking-widest">AI Recommended</div>
                    <div className="text-[10px] uppercase font-bold text-[#00D4FF] tracking-widest mb-2">Safe Route Identified</div>
                    <div className="text-sm font-mono text-white mb-4">
                      {v.recommendedRoute.join(' → ')}
                    </div>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="px-2 py-1 bg-[#22C55E]/20 text-[#22C55E] text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#22C55E]" /> SAFE
                      </div>
                      <div className="text-xs font-mono text-[#00D4FF] font-bold">Projected ETA: {v.projectedETA} min</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 border-t border-[#1C2B3A] pt-3 mb-4">
                      <div>
                        <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Time Saved</div>
                        <div className="text-sm font-bold text-[#22C55E]">{(v.currentETA || 20) - (v.projectedETA || 9)} min</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Route Risk</div>
                        <div className="text-sm font-bold text-[#22C55E]">LOW</div>
                      </div>
                    </div>
                    
                    <button className="w-full py-2 bg-[#1C2B3A] text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-[#2A3F54] transition-colors border border-[#2A3F54]">
                      View On Map
                    </button>
                  </div>
                )}
                
                {v.approvalStatus === 'APPROVED' && (
                  <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg p-4">
                    <div className="text-[10px] uppercase font-bold text-[#22C55E] tracking-widest mb-2">Route Approved</div>
                    <div className="text-xs text-[#E2E8F0] mb-2">Ambulance {v.id} successfully rerouted.</div>
                    {v.corridorStatus === 'ACTIVE' && (
                      <div className="text-xs font-mono text-[#00D4FF]">Emergency corridor active. Traffic support deployed.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {vehicles.every(v => v.routeState === 'CLEAR') && (
            <div className="text-center py-8 text-[#64748B] text-sm">
              All ambulance routes currently clear.
            </div>
          )}
        </section>

      </div>
      <div className="text-[10px] text-[#64748B] text-center italic font-bold">
        * SIMULATED PROTOTYPE OUTPUT
      </div>
    </div>
  );
}
