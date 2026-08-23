import { useStore } from '../store/useSimulationStore';
import { FileText, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';

export default function AuditHistoryPage() {
  const { auditHistory } = useStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'SIMULATION_OUTCOME': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'APPROVAL': return <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />;
      case 'REVIEW': return <FileText className="w-4 h-4 text-[#00D4FF]" />;
      default: return <ShieldAlert className="w-4 h-4 text-[#94A3B8]" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <FileText className="w-6 h-6 text-[#00D4FF]" />
          Decision Audit History
        </h1>
        <p className="text-sm text-[#94A3B8] mt-2">
          Immutable log of all causal state changes, engine predictions, and operator approvals for post-incident review.
        </p>
      </div>

      <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6 shadow-xl">
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-4">
          {auditHistory.length === 0 ? (
            <div className="text-[#64748B] text-center py-12">No audit logs available for the current session.</div>
          ) : (
            auditHistory.map((log, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-lg bg-[#07111F] border border-[#1C2B3A]">
                <div className="w-24 shrink-0 text-right pt-0.5">
                  <span className="text-xs font-mono font-bold text-[#64748B]">{log.timestamp}</span>
                </div>
                <div className="mt-0.5 shrink-0">
                  {getIcon(log.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{
                      color: log.type === 'APPROVAL' ? '#22C55E' : log.type === 'SIMULATION_OUTCOME' ? '#F59E0B' : '#00D4FF'
                    }}>
                      {log.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-[#64748B]">Actor: {log.actor}</span>
                  </div>
                  <div className="text-sm text-[#E2E8F0] mb-2">{log.desc}</div>
                  
                  {log.confidence && (
                    <div className="inline-block px-2 py-1 bg-[#1C2B3A] rounded text-[10px] font-mono text-[#00D4FF]">
                      Confidence / Feasibility: {log.confidence}%
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
