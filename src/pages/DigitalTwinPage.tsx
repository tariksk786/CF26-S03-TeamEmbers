import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useStore } from '../store/useSimulationStore';
import { Zap, Droplets, Car, Hospital, Radio, Flame } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import type { InfraNode, NodeStatus } from '../types';

const typeIcons: Record<string, any> = { power: Zap, water: Droplets, traffic: Car, hospital: Hospital, telecom: Radio, emergency: Flame };
const statusColors: Record<NodeStatus, string> = {
  operational: 'bg-[#00D4FF] text-[#07111F] shadow-[0_0_10px_rgba(0,212,255,0.6)]',
  degraded: 'bg-[#F59E0B] text-[#07111F] shadow-[0_0_10px_rgba(245,158,11,0.5)]',
  failed: 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.8)]',
  predicted: 'bg-transparent text-[#F59E0B] border-2 border-dashed border-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.3)]',
  recovered: 'bg-[#22C55E] text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]',
};

function makeIcon(node: InfraNode) {
  const Icon = typeIcons[node.type] || Zap;
  const html = renderToString(
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${statusColors[node.status]} ${node.status === 'failed' ? 'animate-pulse' : ''}`}>
      <Icon style={{ width: 14, height: 14 }} />
    </div>
  );
  return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
}

function edgeColor(srcStatus: NodeStatus) {
  if (srcStatus === 'failed') return '#EF4444';
  if (srcStatus === 'degraded') return '#F59E0B';
  return 'rgba(0,212,255,0.15)';
}

export default function DigitalTwinPage() {
  const { nodes, edges, triggerFailure } = useStore();
  const center: [number, number] = [28.6320, -77.2100];

  return (
    <div className="h-[calc(100vh-56px)] relative">
      <MapContainer center={center} zoom={14} scrollWheelZoom zoomControl={false} className="w-full h-full" style={{ background: '#07111F' }}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {/* Edges */}
        {edges.map(e => {
          const s = nodes[e.source], t = nodes[e.target];
          if (!s || !t) return null;
          return (
            <Polyline key={e.id} positions={[s.position, t.position]}
              color={edgeColor(s.status)} weight={e.strength * 3.5} opacity={0.6}
              dashArray={s.status === 'failed' ? '5,10' : undefined}
            />
          );
        })}
        {/* Nodes */}
        {Object.values(nodes).map(n => (
          <Marker key={n.id} position={n.position} icon={makeIcon(n)}>
            <Popup>
              <div style={{ minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{n.name}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Type</span><span style={{ fontWeight: 600, textTransform: 'uppercase', color: '#E2E8F0' }}>{n.type}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Status</span><span style={{ fontWeight: 600, textTransform: 'uppercase', color: n.status === 'failed' ? '#EF4444' : n.status === 'degraded' ? '#F59E0B' : '#22C55E' }}>{n.status}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Zone</span><span style={{ color: '#E2E8F0' }}>{n.zone}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Criticality</span><span style={{ fontWeight: 700, color: '#E2E8F0' }}>{n.criticalityScore}/100</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pop. Served</span><span style={{ color: '#E2E8F0' }}>{n.populationServed.toLocaleString()}</span></div>
                  {n.hasBackup && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Backup</span><span style={{ color: '#22C55E' }}>{n.backupDurationMin} min</span></div>}
                </div>
                {n.status === 'operational' && (
                  <button onClick={() => triggerFailure(n.id, 'Manual Simulation Trigger')}
                    style={{ width: '100%', marginTop: 8, padding: '6px 0', borderRadius: 4, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    Simulate Failure
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-[1000] bg-[#07111F]/90 border border-[#1C2B3A] backdrop-blur px-3 py-2.5 rounded-lg text-[11px]">
        <div className="font-bold text-white text-[10px] uppercase tracking-widest mb-2">Map Legend</div>
        {[
          { cls: 'bg-[#00D4FF] shadow-[0_0_4px_#00D4FF]', label: 'Operational' },
          { cls: 'bg-[#F59E0B]', label: 'Degraded' },
          { cls: 'bg-red-500 shadow-[0_0_4px_red]', label: 'Failed' },
          { cls: 'border-2 border-dashed border-[#F59E0B] bg-transparent', label: 'Predicted Risk' },
          { cls: 'bg-[#22C55E]', label: 'Recovered' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2 mb-1 text-[#94A3B8]">
            <div className={`w-2 h-2 rounded-full ${l.cls}`} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
