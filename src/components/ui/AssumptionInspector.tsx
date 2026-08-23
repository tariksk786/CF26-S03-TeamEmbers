import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export function AssumptionInspector({ reasons, confidence }: { reasons: string[], confidence: number | string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#00D4FF] hover:text-white transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
        WHY? / ASSUMPTIONS
        {isOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {isOpen && (
        <div className="mt-2 p-3 bg-[#0D1B2A] border border-[#1C2B3A] rounded shadow-inner">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#1C2B3A]/50">
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">Prediction Confidence</span>
            <span className="text-xs font-mono text-[#00D4FF] font-bold">{confidence}%</span>
          </div>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="text-xs text-[#E2E8F0] flex items-start gap-2 leading-relaxed">
                <span className="text-[#00D4FF] mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
