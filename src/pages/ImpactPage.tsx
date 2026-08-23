import { useStore } from '../store/useSimulationStore';
import { Users, Hospital, Clock, AlertTriangle, MapPin, Shield, TrendingDown, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const COLORS = ['#EF4444', '#F59E0B', '#00D4FF', '#22C55E', '#A78BFA'];

export default function ImpactPage() {
  const { impact, nodes, scenario } = useStore();

  // Zone breakdown
  const zones = new Map<string, { total: number; affected: number }>();
  Object.values(nodes).forEach(n => {
    const z = zones.get(n.zone) || { total: 0, affected: 0 };
    z.total++;
    if (n.status === 'failed' || n.status === 'degraded' || n.status === 'predicted') z.affected++;
    zones.set(n.zone, z);
  });
  const zoneData = Array.from(zones.entries()).map(([name, v]) => ({ name: name.replace(' Zone', ''), affected: v.affected, total: v.total }));

  // Life-Safety Impact Score
  const lifeSafetyScore = Math.max(0, Math.min(100,
    Math.round(
      (impact.resilienceScore * 0.3) +
      (Math.max(0, 100 - impact.emergencyDelayMin * 5) * 0.25) +
      (Math.max(0, 100 - impact.hospitalsAffected * 30) * 0.25) +
      (Math.max(0, 100 - impact.criticalServicesDisrupted * 15) * 0.2)
    )
  ));
  const lifeSafetyLevel = lifeSafetyScore > 70 ? 'LOW' : lifeSafetyScore > 40 ? 'MODERATE' : lifeSafetyScore > 20 ? 'HIGH' : 'CRITICAL';
  const lifeSafetyColor = lifeSafetyScore > 70 ? '#22C55E' : lifeSafetyScore > 40 ? '#F59E0B' : '#EF4444';

  const pieData = [
    { name: 'Score', value: lifeSafetyScore },
    { name: 'Remaining', value: 100 - lifeSafetyScore },
  ];

  const statusCounts = { operational: 0, degraded: 0, failed: 0, predicted: 0, recovered: 0 };
  Object.values(nodes).forEach(n => { statusCounts[n.status]++; });
  const statusData = [
    { name: 'Operational', count: statusCounts.operational, fill: '#00D4FF' },
    { name: 'Degraded', count: statusCounts.degraded, fill: '#F59E0B' },
    { name: 'Failed', count: statusCounts.failed, fill: '#EF4444' },
    { name: 'Predicted', count: statusCounts.predicted, fill: '#FCD34D' },
    { name: 'Recovered', count: statusCounts.recovered, fill: '#22C55E' },
  ].filter(d => d.count > 0);

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Impact Intelligence</h1>
        <p className="text-xs text-[#64748B] mt-1">Human life-safety impact analysis — who is affected and how severely.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Life-Safety Score */}
        <div className="bg-[#0D1B2A]/70 border border-[#1C2B3A] rounded-lg p-6 flex flex-col items-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-4">Life-Safety Impact Score</div>
          <div className="w-40 h-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={50} outerRadius={70} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                  <Cell fill={lifeSafetyColor} />
                  <Cell fill="#1C2B3A" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold font-mono" style={{ color: lifeSafetyColor }}>{lifeSafetyScore}</span>
              <span className="text-[9px] text-[#64748B] uppercase tracking-widest">/100</span>
            </div>
          </div>
          <div className="mt-3 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest" style={{ background: `${lifeSafetyColor}20`, color: lifeSafetyColor }}>
            {lifeSafetyLevel} RISK
          </div>
          <div className="mt-4 w-full space-y-2 text-[11px]">
            {[
              { label: 'Emergency Accessibility', val: Math.max(0, 100 - impact.emergencyDelayMin * 5) },
              { label: 'Critical Facility Exposure', val: Math.max(0, 100 - impact.hospitalsAffected * 30) },
              { label: 'Population Exposure', val: Math.max(0, 100 - Math.floor(impact.citizensAtRisk / 1000)) },
              { label: 'Infrastructure Dependency', val: Math.max(0, 100 - impact.criticalServicesDisrupted * 15) },
            ].map(b => (
              <div key={b.label}>
                <div className="flex justify-between text-[#94A3B8] mb-0.5">
                  <span>{b.label}</span><span className="font-mono font-semibold text-white">{b.val}</span>
                </div>
                <div className="h-1 bg-[#1C2B3A] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${b.val}%`, background: b.val > 70 ? '#22C55E' : b.val > 40 ? '#F59E0B' : '#EF4444' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Impact KPIs */}
        <div className="space-y-3">
          {[
            { label: 'Citizens at Risk', value: impact.citizensAtRisk.toLocaleString(), icon: Users, color: impact.citizensAtRisk > 0 ? 'text-red-500' : 'text-[#22C55E]', desc: 'Zone-level aggregated — no individual data exposed' },
            { label: 'Hospitals Affected', value: String(impact.hospitalsAffected), icon: Hospital, color: impact.hospitalsAffected > 0 ? 'text-red-500' : 'text-[#22C55E]', desc: 'Includes accessibility and capacity impact' },
            { label: 'Emergency Response Delay', value: `+${impact.emergencyDelayMin} min`, icon: Clock, color: impact.emergencyDelayMin > 10 ? 'text-red-500' : impact.emergencyDelayMin > 0 ? 'text-[#F59E0B]' : 'text-[#22C55E]', desc: 'Estimated delay for emergency vehicles' },
            { label: 'Critical Services Disrupted', value: String(impact.criticalServicesDisrupted), icon: AlertTriangle, color: impact.criticalServicesDisrupted > 2 ? 'text-red-500' : 'text-[#F59E0B]' },
            { label: 'Affected Zones', value: String(impact.affectedZones), icon: MapPin, color: impact.affectedZones > 0 ? 'text-[#F59E0B]' : 'text-[#22C55E]' },
            { label: 'City Resilience Score', value: `${impact.resilienceScore}%`, icon: Shield, color: impact.resilienceScore < 50 ? 'text-red-500' : impact.resilienceScore < 70 ? 'text-[#F59E0B]' : 'text-[#22C55E]' },
          ].map(kpi => (
            <motion.div key={kpi.label} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-[#0D1B2A]/70 border border-[#1C2B3A] rounded-lg p-3 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-[#07111F] flex items-center justify-center">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className="flex-1">
                <div className="text-[9px] text-[#64748B] uppercase tracking-widest">{kpi.label}</div>
                <div className={`text-lg font-extrabold font-mono ${kpi.color}`}>{kpi.value}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Zone Breakdown + Infrastructure Status */}
        <div className="space-y-4">
          <div className="bg-[#0D1B2A]/70 border border-[#1C2B3A] rounded-lg p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-3">Infrastructure Status</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ background: '#0D1B2A', border: '1px solid #1C2B3A', borderRadius: 6, fontSize: 11 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#0D1B2A]/70 border border-[#1C2B3A] rounded-lg p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-3">Zone Accessibility</div>
            <div className="space-y-2">
              {zoneData.map(z => {
                const pct = z.total > 0 ? Math.round(((z.total - z.affected) / z.total) * 100) : 100;
                const color = pct === 100 ? '#22C55E' : pct > 50 ? '#F59E0B' : '#EF4444';
                const label = pct === 100 ? 'SAFE' : pct > 50 ? 'DEGRADED' : 'AT RISK';
                return (
                  <div key={z.name} className="flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8] w-36 truncate">{z.name}</span>
                    <div className="flex-1 mx-3 h-1.5 bg-[#1C2B3A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[10px] font-bold font-mono" style={{ color }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
