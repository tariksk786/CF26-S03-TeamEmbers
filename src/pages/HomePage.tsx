import { useStore } from '../store/useSimulationStore';
import { Activity, PlayCircle, ShieldAlert, ArrowRight, Zap, Target, BarChart2, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import 'leaflet/dist/leaflet.css';
import { getRiskLevel, getPriorityBg, getPriorityLabel } from '../types';
import type { IncidentPriority } from '../types';

const getStatusColors = (status: string) => {
  if (status === 'UNKNOWN') return 'bg-gray-500 text-white border-gray-400';
  switch (status) {
    case 'OPERATIONAL': return 'bg-[#22C55E] text-white shadow-[0_0_10px_rgba(34,197,94,0.3)] border-[#22C55E]';
    case 'DEGRADED': return 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)] border-amber-500';
    case 'FAILED': return 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.8)] border-red-500';
    case 'PREDICTED_RISK': return 'bg-[#07111F] text-purple-400 border-2 border-dashed border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]';
    case 'RECOVERING': return 'bg-[#00D4FF] text-[#07111F] border-[#00D4FF]';
    default: return 'bg-gray-500 text-white border-gray-400';
  }
};

function makeIcon(status: string) {
  const colors = getStatusColors(status);
  const pulse = status === 'FAILED' ? 'animate-pulse' : '';
  const html = renderToString(
    <div className={`w-4 h-4 rounded-full border-2 ${colors} ${pulse}`} />
  );
  return L.divIcon({ html, className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
}

export default function HomePage() {
  const { currentMetrics, start60sDemo, demoActive, nodes, edges, scenario, approvedInterventionId, vehicles, incidents, publicAdvisories } = useStore();
  const navigate = useNavigate();

  const handleStartDemo = () => {
    start60sDemo();
    navigate('/simulator');
  };

  const center: [number, number] = [21.1458, 79.0882];

  // Dynamically generate the active cascade sequence from current node states
  const activeNodes = Object.values(nodes).filter(n => ['FAILED', 'DEGRADED', 'PREDICTED_RISK'].includes(n.status));
  activeNodes.sort((a, b) => {
    const rank = { FAILED: 1, DEGRADED: 2, PREDICTED_RISK: 3 };
    return (rank[a.status as keyof typeof rank] || 4) - (rank[b.status as keyof typeof rank] || 4);
  });

  const riskLevel = getRiskLevel(currentMetrics.riskScore);
  
  // Top 3 incidents
  const topIncidents = incidents.filter(i => i.status !== 'RESOLVED').slice(0, 3);
  const otherIncidentCount = Math.max(0, incidents.filter(i => i.status !== 'RESOLVED').length - 3);

  // Find top recommended or approved intervention
  const recommendedIntv = scenario?.interventions?.find(i => i.id === approvedInterventionId) || scenario?.interventions?.[0];

  return (
    <main className="p-6 max-w-[1600px] mx-auto flex flex-col min-h-[calc(100vh-56px)] space-y-6">
      
      {/* Compact Hero */}
      <section className="bg-gradient-to-r from-[#0D1B2A] to-[#1C2B3A] border border-[#00D4FF]/20 rounded-xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between shrink-0">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#00D4FF] via-transparent to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-[#00D4FF]" />
            <h1 className="text-3xl font-extrabold text-white tracking-widest">LIFEGRID</h1>
          </div>
          <p className="text-[#94A3B8] text-lg font-medium leading-relaxed">
            Urban Cascade Decision & Coordinated Response Intelligence Platform. <br/>
            <span className="text-[#00D4FF]">Detect → Understand → Predict → Impact → Prioritize → Coordinate → Inform → Act → Verify → Recover</span>
          </p>
        </div>

        <div className="relative z-10 mt-6 md:mt-0 flex flex-col items-center gap-3">
          <button 
            onClick={handleStartDemo}
            disabled={demoActive}
            className="flex items-center gap-2 bg-[#00D4FF] text-[#07111F] px-8 py-4 rounded-lg font-bold hover:bg-[#00B4D8] transition-colors disabled:opacity-50 text-lg shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]"
          >
            <PlayCircle className="w-6 h-6" />
            {demoActive ? 'DEMO RUNNING...' : 'START 60-SECOND DEMO'}
          </button>
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">
            Simulated Prototype Data
          </span>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        
        {/* Active Cascade Panel */}
        <section className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6 shadow-lg lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Active Cascade</h2>
          </div>

          <div className="flex items-center justify-between bg-[#07111F] p-4 rounded-lg border border-[#1C2B3A] mb-4 overflow-x-auto min-h-[60px]">
            <div className="flex items-center shrink-0">
              {activeNodes.length === 0 ? (
                <span className="text-[#94A3B8] text-xs font-bold uppercase tracking-widest">No Active Cascade</span>
              ) : (
                activeNodes.map((n, idx) => (
                  <div key={n.id} className="flex items-center">
                    <span className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap border
                      ${n.status === 'FAILED' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 
                        n.status === 'DEGRADED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 
                        'bg-purple-500/10 text-purple-400 border-purple-500/30'}`}
                    >
                      {n.name} {n.serviceState || n.status.replace('_', ' ')}
                    </span>
                    {idx < activeNodes.length - 1 && <ArrowRight className="w-4 h-4 text-[#64748B] mx-2 shrink-0" />}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Current Risk</div>
              <div className={`text-xl font-bold ${riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'text-red-500' : riskLevel === 'MODERATE' ? 'text-amber-500' : 'text-[#22C55E]'}`}>
                {riskLevel}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Cascade Depth</div>
              <div className="text-xl font-bold text-white">{currentMetrics.cascadeDepth}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Active Emergencies</div>
              <div className="text-xl font-bold text-[#00D4FF]">{currentMetrics.emergencyCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Impact Score</div>
              <div className="text-xl font-bold text-red-400">{currentMetrics.lifeSafetyImpactScore}/100</div>
            </div>
          </div>
        </section>

        {/* Operational Priorities Panel — NEW */}
        <section className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Priority Queue</h2>
            </div>
            {incidents.length > 0 && (
              <span className="text-[9px] font-bold bg-red-500/15 text-red-500 px-2 py-0.5 rounded border border-red-500/30">
                {incidents.filter(i => i.status !== 'RESOLVED').length} ACTIVE
              </span>
            )}
          </div>

          {topIncidents.length === 0 ? (
            <div className="text-xs text-[#64748B] italic py-6 text-center">No active incidents</div>
          ) : (
            <div className="space-y-3">
              {topIncidents.map(inc => (
                <div key={inc.id} className={`p-3 rounded-lg border ${getPriorityBg(inc.priority)} bg-opacity-50`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-bold uppercase tracking-widest border px-1.5 py-0.5 rounded ${getPriorityBg(inc.priority)}`}>
                      {inc.priority} — {getPriorityLabel(inc.priority as IncidentPriority)}
                    </span>
                    <span className="text-[9px] text-[#64748B] font-mono">{inc.category}</span>
                  </div>
                  <div className="text-xs font-bold text-white mb-1 truncate">{inc.title}</div>
                  <div className="text-[10px] text-[#94A3B8] leading-snug truncate">{inc.whyPriority}</div>
                </div>
              ))}
              {otherIncidentCount > 0 && (
                <button onClick={() => navigate('/planner')} className="w-full text-center text-[10px] font-bold text-[#00D4FF] hover:text-white transition-colors py-2 border border-[#1C2B3A] rounded">
                  + {otherIncidentCount} more active issue{otherIncidentCount > 1 ? 's' : ''} →
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Real-time KPI summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-lg p-4 flex items-center gap-4">
          <div className="p-2 bg-[#00D4FF]/10 rounded text-[#00D4FF]"><Activity className="w-5 h-5" /></div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest">Resilience</div>
            <div className={`text-xl font-bold ${currentMetrics.resilienceScore < 50 ? 'text-red-500' : 'text-[#00D4FF]'}`}>{currentMetrics.resilienceScore}%</div>
          </div>
        </div>
        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-lg p-4 flex items-center gap-4">
          <div className="p-2 bg-red-500/10 rounded text-red-500"><Target className="w-5 h-5" /></div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest">Risk Score</div>
            <div className={`text-xl font-bold ${currentMetrics.riskScore > 0 ? 'text-red-500' : 'text-[#94A3B8]'}`}>{currentMetrics.riskScore}/100</div>
          </div>
        </div>
        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-lg p-4 flex items-center gap-4">
          <div className="p-2 bg-amber-500/10 rounded text-amber-500"><ShieldAlert className="w-5 h-5" /></div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest">Exposed Pop.</div>
            <div className={`text-xl font-bold ${currentMetrics.populationExposed > 0 ? 'text-amber-500' : 'text-[#94A3B8]'}`}>
              {currentMetrics.populationExposed > 0 ? (currentMetrics.populationExposed / 1000).toFixed(1) + 'k' : '0'}
            </div>
          </div>
        </div>
        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-lg p-4 flex items-center gap-4">
          <div className="p-2 bg-purple-500/10 rounded text-purple-400"><BarChart2 className="w-5 h-5" /></div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest">Emergency Delay</div>
            <div className={`text-xl font-bold ${currentMetrics.emergencyDelayMin > 0 ? 'text-purple-400' : 'text-[#94A3B8]'}`}>
              +{currentMetrics.emergencyDelayMin} min
            </div>
          </div>
        </div>
        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-lg p-4 flex items-center gap-4">
          <div className="p-2 bg-[#22C55E]/10 rounded text-[#22C55E]"><CheckCircle className="w-5 h-5" /></div>
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest">Data Confidence</div>
            <div className={`text-xl font-bold ${(currentMetrics.dataConfidence || 100) < 70 ? 'text-amber-500' : 'text-[#22C55E]'}`}>
              {currentMetrics.dataConfidence || 100}%
            </div>
          </div>
        </div>
      </div>

      {/* City Overview Map - Fills Remaining Space */}
      <div className="flex-1 bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl overflow-hidden flex flex-col shadow-lg min-h-[300px]">
        <div className="p-3 border-b border-[#1C2B3A] flex items-center justify-between bg-[#07111F]/50">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#00D4FF]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-widest">Live City Overview</h2>
          </div>
          <button onClick={() => navigate('/map')} className="text-[10px] font-bold uppercase tracking-widest text-[#00D4FF] hover:text-white transition-colors">
            Open Full Infrastructure Map &rarr;
          </button>
        </div>
        <div className="flex-1 relative">
          <MapContainer center={center} zoom={13} scrollWheelZoom={false} zoomControl={false} className="w-full h-full demo-map-bg">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="dark-map-tiles"
            />
            
            {/* Show edges */}
            {edges.map(e => {
              const s = nodes[e.source], t = nodes[e.target];
              if (!s || !t) return null;
              return (
                <Polyline 
                  key={e.id} 
                  positions={[[s.lat, s.lng], [t.lat, t.lng]]}
                  color={s.status === 'FAILED' ? '#EF4444' : s.status === 'DEGRADED' ? '#F59E0B' : '#A855F7'}
                  weight={e.strength * 2} 
                  opacity={0.6}
                  dashArray={s.status === 'FAILED' ? '5,10' : undefined}
                />
              );
            })}

            {/* Show nodes */}
            {Object.values(nodes).map(n => (
              <Marker key={n.id} position={[n.lat, n.lng]} icon={makeIcon(n.status)} />
            ))}
          </MapContainer>
        </div>
      </div>

    </main>
  );
}
