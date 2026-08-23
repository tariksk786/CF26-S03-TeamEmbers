import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useStore } from '../store/useSimulationStore';
import { Zap, Droplets, Car, Hospital, Radio, Flame, ShieldAlert, ArrowRight, Activity, Map as MapIcon, Share2, Route } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import type { InfraNode, NodeStatus, DepEdge } from '../types';
import { EvidenceBadge } from '../components/ui/EvidenceBadge';

const typeIcons: Record<string, any> = { power: Zap, water: Droplets, traffic: Car, hospital: Hospital, telecom: Radio, ambulance_station: Flame, emergency_route: Car };

const getStatusColors = (status: NodeStatus, isSelected: boolean) => {
  if (status === 'UNKNOWN') return 'bg-gray-500 text-white border-gray-400';
  if (isSelected) return 'bg-[#00D4FF] text-[#07111F] shadow-[0_0_15px_rgba(0,212,255,0.8)] border-white';
  
  switch (status) {
    case 'OPERATIONAL': return 'bg-[#22C55E] text-white shadow-[0_0_10px_rgba(34,197,94,0.3)] border-[#22C55E]';
    case 'DEGRADED': return 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)] border-amber-500';
    case 'FAILED': return 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.8)] border-red-500';
    case 'PREDICTED_RISK': return 'bg-[#07111F] text-purple-400 border-2 border-dashed border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]';
    case 'RECOVERING': return 'bg-[#00D4FF] text-[#07111F] border-[#00D4FF]';
    default: return 'bg-gray-500 text-white border-gray-400';
  }
};

function makeIcon(node: InfraNode, isSelected: boolean) {
  const Icon = typeIcons[node.type] || Zap;
  const colors = getStatusColors(node.status, isSelected);
  const pulse = node.status === 'FAILED' ? 'animate-pulse' : '';
  const html = renderToString(
    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${colors} ${pulse}`}>
      <Icon style={{ width: 16, height: 16 }} />
    </div>
  );
  return L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
}

function edgeColor(status: NodeStatus) {
  if (status === 'FAILED') return '#EF4444';
  if (status === 'DEGRADED') return '#F59E0B';
  if (status === 'PREDICTED_RISK') return '#A855F7';
  return 'rgba(0,212,255,0.15)';
}

const mockRouteCoords: Record<string, [number, number]> = {
  'R-12': [21.1350, 79.0800],
  'R-17': [21.1460, 79.0880], // ER-01
  'J-17': [21.1480, 79.0850], // TJ-01
  'H-01': [21.1500, 79.0950], // HO-01
  'R-21': [21.1420, 79.0920],
  'J-09': [21.1450, 79.0980],
  'R-05': [21.1300, 79.0750],
  'R-08': [21.1400, 79.0800],
  'J-11': [21.1440, 79.0820],
  'R-02': [21.1520, 79.0880],
  'R-04': [21.1540, 79.0850],
  'J-04': [21.1550, 79.0900]
};

export default function InfrastructureMapPage() {
  const { nodes, edges, vehicles } = useStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dependencyView, setDependencyView] = useState(false);
  const [routeView, setRouteView] = useState(false);
  const center: [number, number] = [21.1458, 79.0882];

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

  // Compute active edges based on selection and dependency view toggle
  const activeEdges = useMemo(() => {
    if (!dependencyView) return edges; // Show all lines in map view by default
    if (selectedNodeId) {
      return edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId);
    }
    // If dependency view is on but no selection, show all active cascade edges
    return edges.filter(e => {
      const src = nodes[e.source];
      return src && (src.status === 'FAILED' || src.status === 'DEGRADED' || src.status === 'PREDICTED_RISK');
    });
  }, [edges, selectedNodeId, dependencyView, nodes]);

  return (
    <div className="h-[calc(100vh-56px)] flex relative">
      
      {/* Map Area */}
      <div className={`flex-1 relative transition-all duration-300 ${selectedNode ? 'mr-[360px]' : ''}`}>
        
        {/* Top Controls */}
        <div className="absolute top-4 left-4 z-[1000] flex gap-2">
          <button 
            onClick={() => { setDependencyView(false); setRouteView(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border backdrop-blur-md transition-colors ${!dependencyView && !routeView ? 'bg-[#00D4FF]/20 border-[#00D4FF] text-[#00D4FF]' : 'bg-[#07111F]/80 border-[#1C2B3A] text-[#94A3B8] hover:text-white'}`}
          >
            <MapIcon className="w-4 h-4" /> Map View
          </button>
          <button 
            onClick={() => { setDependencyView(true); setRouteView(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border backdrop-blur-md transition-colors ${dependencyView ? 'bg-[#00D4FF]/20 border-[#00D4FF] text-[#00D4FF]' : 'bg-[#07111F]/80 border-[#1C2B3A] text-[#94A3B8] hover:text-white'}`}
          >
            <Share2 className="w-4 h-4" /> Dependency View
          </button>
          <button 
            onClick={() => { setRouteView(true); setDependencyView(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border backdrop-blur-md transition-colors ${routeView ? 'bg-[#00D4FF]/20 border-[#00D4FF] text-[#00D4FF]' : 'bg-[#07111F]/80 border-[#1C2B3A] text-[#94A3B8] hover:text-white'}`}
          >
            <Route className="w-4 h-4" /> Ambulance Routes
          </button>
        </div>

        <MapContainer center={center} zoom={14} scrollWheelZoom zoomControl={false} className="w-full h-full demo-map-bg">
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="dark-map-tiles"
          />
          
          {/* Edges */}
          {!routeView && activeEdges.map(e => {
            const s = nodes[e.source], t = nodes[e.target];
            if (!s || !t) return null;
            return (
              <Polyline 
                key={e.id} 
                positions={[[s.lat, s.lng], [t.lat, t.lng]]}
                color={edgeColor(s.status)} 
                weight={e.strength * 4} 
                opacity={0.8}
                dashArray={s.status === 'FAILED' ? '5,10' : undefined}
              />
            );
          })}
          
          {/* Ambulance Routes (Only in routeView) */}
          {routeView && vehicles.map(v => {
            if (!v.currentRoute) return null;
            
            // Map the route IDs to coordinates
            const getCoords = (rList: string[]) => rList.map(r => mockRouteCoords[r]).filter(Boolean) as [number, number][];
            
            const currentRouteCoords = getCoords(v.currentRoute);
            const isBlocked = v.routeState === 'BLOCKED' && v.approvalStatus === 'PENDING';
            const isApproved = v.approvalStatus === 'APPROVED';

            const polylines = [];
            
            if (currentRouteCoords.length > 1) {
              polylines.push(
                <Polyline 
                  key={`${v.id}-current`} 
                  positions={currentRouteCoords}
                  color={isBlocked ? '#EF4444' : (isApproved ? '#22C55E' : '#00D4FF')} 
                  weight={4} 
                  opacity={0.8}
                  dashArray={isBlocked ? '5,10' : undefined}
                />
              );
            }

            if (v.recommendedRoute && v.approvalStatus === 'PENDING') {
              const recRouteCoords = getCoords(v.recommendedRoute);
              if (recRouteCoords.length > 1) {
                polylines.push(
                  <Polyline 
                    key={`${v.id}-rec`} 
                    positions={recRouteCoords}
                    color="#22C55E" 
                    weight={4} 
                    opacity={0.8}
                  />
                );
              }
            }

            return <>{polylines}</>;
          })}
          
          {/* Nodes */}
          {Object.values(nodes).map(n => (
            <Marker 
              key={n.id} 
              position={[n.lat, n.lng]} 
              icon={makeIcon(n, selectedNodeId === n.id)}
              eventHandlers={{ click: () => setSelectedNodeId(n.id) }}
            />
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-6 left-4 z-[1000] bg-[#07111F]/95 border border-[#1C2B3A] backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl">
          <div className="font-bold text-white text-[10px] uppercase tracking-widest mb-3">State Colors</div>
          {[
            { cls: 'bg-[#22C55E]', label: 'Operational / Safe Route' },
            { cls: 'bg-amber-500', label: 'Degraded' },
            { cls: 'bg-red-500 shadow-[0_0_8px_red]', label: 'Failed / Blocked Route' },
            { cls: 'border-2 border-dashed border-purple-500 bg-transparent', label: 'Predicted Risk' },
            { cls: 'bg-gray-500', label: 'Unknown' },
            { cls: 'bg-[#00D4FF]', label: 'Selected / Normal Route' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2 mb-1.5 text-xs font-medium text-[#94A3B8]">
              <div className={`w-3 h-3 rounded-full ${l.cls}`} />
              <span>{l.label}</span>
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-[#1C2B3A] text-[9px] text-[#64748B] text-center italic font-bold">
            * SIMULATED PROTOTYPE DATA
          </div>
        </div>
      </div>

      {/* Right Inspector Panel */}
      <div className={`absolute right-0 top-0 h-full w-[360px] bg-[#0D1B2A]/95 backdrop-blur-xl border-l border-[#1C2B3A] shadow-2xl transition-transform duration-300 transform ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedNode && (
          <div className="p-6 h-full overflow-y-auto flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-widest mb-1">{selectedNode.type}</div>
                <h2 className="text-xl font-bold text-white">{selectedNode.name}</h2>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="text-[#94A3B8] hover:text-white p-1 bg-[#1C2B3A] rounded">✕</button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center pb-2 border-b border-[#1C2B3A]">
                <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-bold">Zone</span>
                <span className="text-sm text-white font-medium">{selectedNode.zone}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1C2B3A]">
                <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-bold">Status</span>
                <span className={`text-sm font-bold uppercase ${selectedNode.status === 'FAILED' ? 'text-red-500' : selectedNode.status === 'DEGRADED' ? 'text-amber-500' : 'text-[#22C55E]'}`}>{selectedNode.status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1C2B3A]">
                <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-bold">Evidence</span>
                <EvidenceBadge type={selectedNode.evidence} />
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1C2B3A]">
                <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-bold">Current Load</span>
                <span className="text-sm font-mono text-white">{selectedNode.currentLoad}%</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1C2B3A]">
                <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-bold">Criticality</span>
                <span className="text-sm font-mono text-amber-500 font-bold">{selectedNode.criticalityScore} / 100</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1C2B3A]">
                <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-bold">Pop. Served</span>
                <span className="text-sm font-mono text-white">{selectedNode.populationServed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#1C2B3A]">
                <span className="text-xs text-[#94A3B8] uppercase tracking-wider font-bold">Data Confidence</span>
                <span className="text-sm font-mono text-[#00D4FF] font-bold">{selectedNode.dataConfidence}%</span>
              </div>
              {selectedNode.backupAvailable && (
                <div className="flex justify-between items-center pb-2 border-b border-[#1C2B3A] bg-[#00D4FF]/5 px-2 -mx-2 rounded">
                  <span className="text-xs text-[#00D4FF] uppercase tracking-wider font-bold">Backup ({selectedNode.backupType})</span>
                  <span className="text-sm font-mono text-[#00D4FF] font-bold">{selectedNode.backupDurationMin} min</span>
                </div>
              )}
            </div>

            <div className="mt-auto space-y-3">
              <button className="w-full py-3 bg-[#1C2B3A] text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-[#2A3F54] transition-colors border border-[#2A3F54]">
                Show Downstream Impact
              </button>
              <button className="w-full py-3 bg-[#1C2B3A] text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-[#2A3F54] transition-colors border border-[#2A3F54]">
                Show Upstream Dependencies
              </button>
              {selectedNode.status !== 'FAILED' ? (
                <button 
                  onClick={() => useStore.getState().manualOverride(selectedNode.id, 'FAILED')}
                  className="w-full py-3 bg-red-500/20 text-red-500 text-xs font-bold uppercase tracking-widest rounded hover:bg-red-500/40 transition-colors border border-red-500/50"
                >
                  Force Fail (Trigger Cascade)
                </button>
              ) : (
                <button 
                  onClick={() => useStore.getState().manualOverride(selectedNode.id, 'OPERATIONAL')}
                  className="w-full py-3 bg-[#22C55E]/20 text-[#22C55E] text-xs font-bold uppercase tracking-widest rounded hover:bg-[#22C55E]/40 transition-colors border border-[#22C55E]/50"
                >
                  Restore Node
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
