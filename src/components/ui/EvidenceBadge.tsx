import type { EvidenceType } from '../../types';

export function EvidenceBadge({ type, className = '' }: { type: EvidenceType, className?: string }) {
  let colors = '';
  switch (type) {
    case 'OBSERVED':
      colors = 'bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30';
      break;
    case 'PREDICTED':
      colors = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      break;
    case 'INFERRED':
      colors = 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${colors} ${className}`}>
      {type}
    </span>
  );
}
