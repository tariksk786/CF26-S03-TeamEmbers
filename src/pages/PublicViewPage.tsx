import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useSimulationStore';
import { Activity, AlertTriangle, Info, MapPin, CheckCircle2 } from 'lucide-react';
import { getPriorityBg, getPriorityColor } from '../types';

export default function PublicViewPage() {
  const [selectedZone, setSelectedZone] = useState('All Areas');
  const publicAdvisories = useStore(s => s.publicAdvisories);

  // We only show advisories that are APPROVED or PUBLISHED, or in demo mode all of them for the hackathon prototype if none exist?
  // Let's filter for those that are not resolved, or maybe resolved for a little while.
  const activeAdvisories = publicAdvisories.filter(a => 
    (selectedZone === 'All Areas' || a.affectedArea.includes(selectedZone)) &&
    a.status !== 'RESOLVED'
  );

  const resolvedAdvisories = publicAdvisories.filter(a => 
    (selectedZone === 'All Areas' || a.affectedArea.includes(selectedZone)) &&
    a.status === 'RESOLVED'
  );

  const isEmergency = activeAdvisories.some(a => a.severity === 'P1');
  const hasDisruptions = activeAdvisories.length > 0;

  const headerStatus = isEmergency 
    ? { label: 'HIGH IMPACT ADVISORY', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' }
    : hasDisruptions
    ? { label: 'SERVICE DISRUPTIONS ACTIVE', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' }
    : { label: 'NORMAL', color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', border: 'border-[#10B981]/30' };

  return (
    <div className="min-h-screen bg-[#07111F] text-white">
      {/* Simple Public Header */}
      <header className="sticky top-0 z-50 bg-[#0D1B2A]/95 backdrop-blur-md border-b border-[#1C2B3A] px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#10B981]" />
          <span className="text-base font-extrabold tracking-[0.15em]">LIFEGRID <span className="font-light text-[#94A3B8]">PUBLIC</span></span>
        </Link>
        <Link to="/login" className="text-[10px] uppercase font-bold tracking-widest text-[#64748B] hover:text-white transition-colors">
          Authority Login
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-wider mb-6">PUBLIC ADVISORIES</h1>

        {/* Status Banner */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${headerStatus.bg} ${headerStatus.border} mb-8`}>
          {isEmergency ? <AlertTriangle className={`w-6 h-6 ${headerStatus.color}`} /> : <Info className={`w-6 h-6 ${headerStatus.color}`} />}
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest">Current Public Status</div>
            <div className={`text-lg font-bold tracking-wide ${headerStatus.color}`}>{headerStatus.label}</div>
          </div>
        </div>

        {/* Zone Filter */}
        <div className="mb-8">
          <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-3">Filter by Area</div>
          <div className="flex flex-wrap gap-2">
            {['All Areas', 'Central Zone', 'Medical Zone', 'North Zone', 'South Zone', 'East Zone', 'West Zone'].map(zone => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-colors ${
                  selectedZone === zone
                    ? 'bg-[#10B981] text-[#07111F]'
                    : 'bg-[#1C2B3A] text-[#94A3B8] hover:text-white hover:bg-[#2A3F54]'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
        </div>

        {/* Active Advisories */}
        {activeAdvisories.length > 0 ? (
          <div className="space-y-6">
            {activeAdvisories.map(adv => (
              <div key={adv.id} className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl overflow-hidden relative shadow-lg">
                <div className={`absolute top-0 left-0 w-1 h-full`} style={{ background: getPriorityColor(adv.severity) }} />
                
                <div className="p-5 pl-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-white tracking-wide uppercase">{adv.advisoryType}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${getPriorityBg(adv.severity)}`}>
                          {adv.severity === 'P1' ? 'CRITICAL' : adv.severity === 'P2' ? 'HIGH' : 'MODERATE'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                        <MapPin className="w-3.5 h-3.5" />
                        {adv.affectedArea}
                      </div>
                    </div>
                    {adv.isSimulated && (
                      <div className="bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest">
                        {adv.simulatedLabel}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 text-sm">
                    {adv.whatHappened && (
                      <div>
                        <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-widest mb-1">Situation</div>
                        <p className="text-white font-medium">{adv.whatHappened}</p>
                      </div>
                    )}
                    
                    {adv.whatToAvoid && (
                      <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg">
                        <div className="text-[10px] text-red-500 uppercase font-bold tracking-widest mb-1">Please Avoid</div>
                        <p className="text-red-200">{adv.whatToAvoid}</p>
                      </div>
                    )}

                    {adv.alternative && (
                      <div className="bg-[#10B981]/5 border border-[#10B981]/10 p-3 rounded-lg">
                        <div className="text-[10px] text-[#10B981] uppercase font-bold tracking-widest mb-1">Alternative</div>
                        <p className="text-[#A7F3D0]">{adv.alternative}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-[#1C2B3A]">
                    <div>
                      <div className="text-[9px] text-[#64748B] uppercase font-bold tracking-widest">Estimated Recovery</div>
                      <div className="text-xs text-white font-medium">{adv.estimatedDuration}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#64748B] uppercase font-bold tracking-widest">Next Update</div>
                      <div className="text-xs text-white font-medium">{adv.nextUpdateTime}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-8 text-center text-[#94A3B8]">
            <CheckCircle2 className="w-12 h-12 text-[#10B981] mx-auto mb-3 opacity-50" />
            <p className="font-medium text-white">No active advisories for this area.</p>
            <p className="text-sm mt-1">Services are operating normally.</p>
          </div>
        )}

        {/* Resolved Advisories */}
        {resolvedAdvisories.length > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-bold tracking-widest text-[#64748B] uppercase mb-4">Recently Resolved</h2>
            <div className="space-y-3">
              {resolvedAdvisories.map(adv => (
                <div key={adv.id} className="bg-[#0D1B2A]/50 border border-[#1C2B3A] rounded-lg p-4 flex items-center justify-between opacity-75">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white uppercase">{adv.advisoryType}</span>
                      <span className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
                        RESOLVED
                      </span>
                    </div>
                    <div className="text-xs text-[#94A3B8]">{adv.affectedArea} — Normal service restored.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
