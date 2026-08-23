import { useStore } from '../store/useSimulationStore';
import { scenarios } from '../data/mockScenarios';
import { Play, Pause, RotateCcw, FastForward, Zap, Droplets, Radio, Car, AlertOctagon, TrendingUp, GitMerge, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { EvidenceBadge } from '../components/ui/EvidenceBadge';
import { AssumptionInspector } from '../components/ui/AssumptionInspector';
import { useNavigate } from 'react-router-dom';

const scenarioIcons: Record<string, any> = { 'power-outage': Zap, 'urban-flood': Droplets, 'telecom-outage': Radio, 'traffic-failure': Car, 'compound-demo': ShieldAlert };

export default function SimulatorPage() {
  const store = useStore();
  const { scenario, nodes, eventTimeline, currentMetrics, predictedNode, loadScenario, advanceClock, reset } = store;
  const navigate = useNavigate();

  // Show all events in timeline, sort reverse chronological (newest top)
  const timelineEvents = [...eventTimeline].reverse();

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Cascade Simulator</h1>
          <p className="text-xs text-[#94A3B8] mt-1">Simulate deterministic urban crisis cascades and failure propagation.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-[#0D1B2A] border border-[#1C2B3A] rounded-full px-4 py-2 shadow-lg">
          <button onClick={reset} className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-[#1C2B3A] transition-colors" title="Reset Simulation">
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#1C2B3A] mx-1" />
          <button onClick={() => advanceClock(1)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors" title="Step +1s">
            <Play className="w-4 h-4" />
          </button>
          <button onClick={() => advanceClock(5)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors" title="Step +5s">
            <FastForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Scenario Library (Left) */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] border-b border-[#1C2B3A] pb-2">Scenario Library</div>
          {Object.values(scenarios).map(sc => {
            const Icon = scenarioIcons[sc.scenarioId] || Zap;
            const active = scenario?.scenarioId === sc.scenarioId;
            return (
              <button key={sc.scenarioId} onClick={() => loadScenario(sc.scenarioId)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  active ? 'bg-[#00D4FF]/10 border-[#00D4FF]/40 shadow-[0_0_15px_rgba(0,212,255,0.1)]' : 'bg-[#0D1B2A]/70 border-[#1C2B3A] hover:border-[#2A3A4C]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${active ? 'text-[#00D4FF]' : 'text-[#64748B]'}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${active ? 'text-[#00D4FF]' : 'text-[#64748B]'}`}>{sc.scenarioId}</span>
                </div>
                <div className="text-sm font-bold text-white mb-1">{sc.name}</div>
                <div className="text-[10px] text-[#94A3B8] leading-snug line-clamp-3">{sc.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Main Cascade Timeline (Center) */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          
          <div className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-6 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-[#1C2B3A] pb-4">
              <div className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-[#00D4FF]" /> Cascade Timeline
              </div>
              <div className="text-xs font-mono text-[#00D4FF] bg-[#00D4FF]/10 px-3 py-1 rounded-full font-bold">
                {timelineEvents.length} Events Logged
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 space-y-4 max-h-[600px] min-h-[400px]">
              {timelineEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-[#64748B] space-y-3">
                  <Play className="w-8 h-8 opacity-50" />
                  <p className="text-sm">Click Step Forward to begin simulation.</p>
                </div>
              )}
              {timelineEvents.map((ev) => (
                <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 p-3 rounded-lg border transition-colors ${
                    ev.type === 'INTERVENTION' ? 'bg-[#22C55E]/10 border-[#22C55E]/30' :
                    ev.type === 'PREDICTED' ? 'bg-purple-500/10 border-purple-500/30' :
                    'bg-[#07111F]/50 border-[#1C2B3A] hover:border-[#2A3A4C]'
                  }`}
                >
                  <div className="w-20 shrink-0 text-right pt-0.5">
                    <span className="text-xs font-mono font-bold text-[#00D4FF]">
                      T+{ev.timestamp.split(':')[2]}s
                    </span>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px] ${
                    ev.type === 'INTERVENTION' ? 'bg-[#22C55E] shadow-[#22C55E]' :
                    ev.type === 'PREDICTED' ? 'bg-purple-400 shadow-purple-400' :
                    'bg-[#00D4FF] shadow-[#00D4FF]'
                  }`} />
                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-1">
                      {ev.entity} {ev.status !== 'UNKNOWN' && <span className="text-white ml-2">{ev.status}</span>}
                    </div>
                    <div className="text-sm text-[#E2E8F0] font-medium leading-relaxed">{ev.desc}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <EvidenceBadge type={ev.type as any} /> 
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Summary Box */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0D1B2A] border border-[#1C2B3A] p-4 rounded-xl">
              <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Depth</div>
              <div className="text-xl font-bold text-white">{currentMetrics.cascadeDepth}</div>
            </div>
            <div className="bg-[#0D1B2A] border border-[#1C2B3A] p-4 rounded-xl">
              <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Emergencies</div>
              <div className="text-xl font-bold text-red-500">{currentMetrics.emergencyCount}</div>
            </div>
            <div className="bg-[#0D1B2A] border border-[#1C2B3A] p-4 rounded-xl">
              <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Pop. Risk</div>
              <div className="text-xl font-bold text-amber-500">{(currentMetrics.populationAtRisk / 1000).toFixed(1)}k</div>
            </div>
            <div className="bg-[#0D1B2A] border border-[#1C2B3A] p-4 rounded-xl">
              <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Delay</div>
              <div className="text-xl font-bold text-[#00D4FF]">{currentMetrics.emergencyDelayMin}m</div>
            </div>
          </div>
        </div>

        {/* Right: Prediction & Interventions */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Prediction Engine */}
          <div className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-5 shadow-lg">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#00D4FF] mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Next Failure Prediction
            </div>
            
            {predictedNode ? (
              <div className="space-y-4">
                <div className="text-base font-bold text-amber-500">{nodes[predictedNode.id]?.name || predictedNode.id}</div>
                <div className="inline-flex px-2.5 py-1 bg-[#07111F] rounded text-xs text-[#94A3B8] border border-[#1C2B3A]">
                  Status: <span className="ml-1 font-bold text-purple-400">Predicted Risk</span>
                </div>
                
                <AssumptionInspector 
                  reasons={predictedNode.reasoning} 
                  confidence={predictedNode.probability} 
                />
              </div>
            ) : (
              <div className="text-xs text-[#64748B] italic py-4">No imminent cascade predicted. Waiting for sufficient telemetry.</div>
            )}
          </div>

          {/* Intervention CTA */}
          {predictedNode && (
            <div className="bg-gradient-to-br from-[#0D1B2A] to-[#07111F] border border-[#00D4FF]/30 rounded-xl p-5 shadow-[0_0_20px_rgba(0,212,255,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D4FF]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#00D4FF] mb-2">System Alert</div>
              <h3 className="text-sm font-bold text-white mb-2">Interventions Available</h3>
              <p className="text-xs text-[#94A3B8] mb-4 leading-relaxed">LIFEGRID has generated feasible response plans to mitigate this predicted cascade.</p>
              
              <button 
                onClick={() => navigate('/planner')}
                className="w-full py-3 bg-[#00D4FF] text-[#07111F] text-xs font-bold uppercase tracking-widest rounded hover:shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all"
              >
                Open Response Planner
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
