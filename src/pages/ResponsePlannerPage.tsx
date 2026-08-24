import { useState } from 'react';
import { useStore } from '../store/useSimulationStore';
import { Zap, CheckCircle2, ShieldAlert, ArrowRight, AlertTriangle, AlertOctagon, Info, Building2, Users, Radio, Siren, ClipboardCheck, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPriorityBg, getPriorityLabel } from '../types';
import type { Incident, CoordinatedResponse, IncidentPriority } from '../types';

type TabId = 'infrastructure' | 'agency' | 'emergency' | 'public' | 'verification';

export default function ResponsePlannerPage() {
  const { scenario, availableResources, allocatedResources, currentMetrics, noActionBaseline, selectIntervention, selectedInterventionId, approveIntervention, incidents, coordinatedResponses, actionTickets, publicAdvisories, approveCoordinatedResponse, vehicles, approveAdvisory, updateAdvisory } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('infrastructure');
  const [isEditingAdvisory, setIsEditingAdvisory] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [whyExpanded, setWhyExpanded] = useState<Record<string, boolean>>({});

  const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED');
  const selectedIncident = activeIncidents.find(i => i.id === selectedIncidentId) || activeIncidents[0];
  const response = selectedIncident ? coordinatedResponses[selectedIncident.id] : null;
  const incidentTickets = selectedIncident ? actionTickets.filter(t => t.incidentId === selectedIncident.id) : [];
  const incidentAdvisory = selectedIncident ? publicAdvisories.find(a => a.incidentId === selectedIncident.id) : null;
  const pendingVehicles = vehicles.filter(v => v.approvalStatus === 'PENDING' && v.recommendedRoute);

  const baseline = noActionBaseline || currentMetrics;

  const toggleWhy = (key: string) => setWhyExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const handleApproveResponse = () => {
    if (!selectedIncident || !response) return;
    approveCoordinatedResponse(selectedIncident.id);
    // Also approve the old-style intervention if available
    if (scenario?.interventions?.[0]) {
      selectIntervention(scenario.interventions[0].id);
      approveIntervention();
    }
    navigate('/recovery');
  };

  // ─── Fallback to old planner if no V2 incidents ────────────────────
  if (activeIncidents.length === 0 && scenario?.interventions?.length) {
    return <OldPlannerFallback />;
  }

  if (!scenario && activeIncidents.length === 0) return <div className="text-white p-6">No scenario active.</div>;

  const tabs: { id: TabId; label: string; icon: any; color: string }[] = [
    { id: 'infrastructure', label: 'Infrastructure', icon: Building2, color: 'text-[#00D4FF]' },
    { id: 'agency', label: 'Agency', icon: Users, color: 'text-amber-500' },
    { id: 'emergency', label: 'Emergency', icon: Siren, color: 'text-red-500' },
    { id: 'public', label: 'Public Advisory', icon: Radio, color: 'text-purple-400' },
    { id: 'verification', label: 'Verification', icon: ClipboardCheck, color: 'text-[#22C55E]' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Coordinated Response Planner</h1>
          <p className="text-xs text-[#94A3B8] mt-1">5-component coordinated action plans with closed-loop verification.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left: Incident List */}
        <div className="lg:col-span-3 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] border-b border-[#1C2B3A] pb-2">Active Incidents ({activeIncidents.length})</div>
          
          {activeIncidents.map(inc => {
            const active = selectedIncidentId === inc.id || (!selectedIncidentId && inc === activeIncidents[0]);
            return (
              <button key={inc.id} onClick={() => setSelectedIncidentId(inc.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  active ? 'bg-[#00D4FF]/10 border-[#00D4FF]/40 shadow-[0_0_15px_rgba(0,212,255,0.1)]' : 'bg-[#0D1B2A]/70 border-[#1C2B3A] hover:border-[#2A3A4C]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${getPriorityBg(inc.priority)}`}>
                    {inc.priority} {getPriorityLabel(inc.priority as IncidentPriority)}
                  </span>
                  <span className="text-[9px] text-[#64748B] font-mono">{inc.category}</span>
                </div>
                <div className="text-sm font-bold text-white mb-1 truncate">{inc.title}</div>
                <div className="text-[10px] text-[#94A3B8] leading-snug line-clamp-2">{inc.whyPriority}</div>
                
                {inc.isRoot && (inc.downstreamIncidents?.length || 0) > 0 && (
                  <div className="mt-2 text-[9px] text-[#64748B] flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> {inc.downstreamIncidents!.length} downstream effect{inc.downstreamIncidents!.length > 1 ? 's' : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Center + Right: Response Detail */}
        <div className="lg:col-span-9 flex flex-col space-y-6">
          
          {selectedIncident && response ? (
            <>
              {/* Incident Header */}
              <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded border ${getPriorityBg(selectedIncident.priority)}`}>
                      {selectedIncident.priority}
                    </span>
                    <h2 className="text-lg font-bold text-white">{selectedIncident.title}</h2>
                  </div>
                  <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest">
                    {selectedIncident.responsibleAgency}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="bg-[#07111F] rounded p-2 border border-[#1C2B3A]">
                    <div className="text-[9px] text-[#64748B] uppercase tracking-widest">Life-Safety</div>
                    <div className="text-sm font-bold text-red-500">{selectedIncident.lifeSafetyImpact}</div>
                  </div>
                  <div className="bg-[#07111F] rounded p-2 border border-[#1C2B3A]">
                    <div className="text-[9px] text-[#64748B] uppercase tracking-widest">Population</div>
                    <div className="text-sm font-bold text-amber-500">{(selectedIncident.populationAffected / 1000).toFixed(1)}k</div>
                  </div>
                  <div className="bg-[#07111F] rounded p-2 border border-[#1C2B3A]">
                    <div className="text-[9px] text-[#64748B] uppercase tracking-widest">Cascade Risk</div>
                    <div className="text-sm font-bold text-purple-400">{selectedIncident.cascadeGrowthRisk}</div>
                  </div>
                  <div className="bg-[#07111F] rounded p-2 border border-[#1C2B3A]">
                    <div className="text-[9px] text-[#64748B] uppercase tracking-widest">Recovery Leverage</div>
                    <div className="text-sm font-bold text-[#00D4FF]">{selectedIncident.recoveryLeverage}</div>
                  </div>
                  <div className="bg-[#07111F] rounded p-2 border border-[#1C2B3A]">
                    <div className="text-[9px] text-[#64748B] uppercase tracking-widest">Time to Critical</div>
                    <div className="text-sm font-bold text-white">{selectedIncident.timeToCriticalMinutes}m</div>
                  </div>
                </div>
              </div>

              {/* WHY Panel */}
              <div className="bg-[#07111F] border border-[#1C2B3A] rounded-xl overflow-hidden">
                <button onClick={() => toggleWhy('main')} className="w-full flex items-center justify-between p-4 hover:bg-[#0D1B2A] transition-colors">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#00D4FF] uppercase tracking-widest">
                    <Eye className="w-4 h-4" /> Why is this critical? What may happen? Why this action?
                  </div>
                  {whyExpanded.main ? <ChevronUp className="w-4 h-4 text-[#64748B]" /> : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
                </button>
                {whyExpanded.main && (
                  <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="text-[9px] font-bold text-red-500 uppercase mb-2">Why Critical?</div>
                      <div className="text-xs text-[#E2E8F0] leading-relaxed">{selectedIncident.whyPriority}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-amber-500 uppercase mb-2">What May Happen?</div>
                      <div className="text-xs text-[#E2E8F0] leading-relaxed">
                        Without action: cascade depth {response.noActionComparison.cascade_depth_no_action}, {(response.noActionComparison.population_at_risk_no_action / 1000).toFixed(1)}k population at risk, {response.noActionComparison.emergency_delay_no_action}min emergency delay.
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-[#22C55E] uppercase mb-2">How Will We Know It Worked?</div>
                      <div className="text-xs text-[#E2E8F0] leading-relaxed">
                        {response.verificationConditions.map(v => v.condition).join('; ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 5-Component Tabs */}
              <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl shadow-xl flex-1">
                <div className="flex border-b border-[#1C2B3A] overflow-x-auto">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${
                          activeTab === tab.id ? `border-b-2 border-[#00D4FF] ${tab.color}` : 'text-[#64748B] hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" /> {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="p-6">
                  {activeTab === 'infrastructure' && (
                    <div className="space-y-4">
                      <div className="text-xs text-[#94A3B8] mb-4">Target: <span className="text-white font-bold">{response.infrastructureAction.target}</span></div>
                      {response.infrastructureAction.actions.map((action, i) => (
                        <div key={i} className="bg-[#07111F] p-4 rounded-lg border border-[#1C2B3A]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-white">{action.description}</span>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${action.feasibility === 'HIGH' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-amber-500/15 text-amber-500'}`}>{action.feasibility}</span>
                          </div>
                          <div className="flex gap-4 text-[10px] text-[#94A3B8]">
                            <span>Setup: {action.setup_time_minutes}min</span>
                            {Object.entries(action.required_resources).map(([k, v]) => (
                              <span key={k} className="text-[#00D4FF]">{v}× {k.replace(/_/g, ' ')}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'agency' && (
                    <div className="space-y-4">
                      <div className="text-xs text-[#94A3B8] mb-2">Primary Agency: <span className="text-white font-bold">{response.agencyAction.primary_agency}</span></div>
                      {response.agencyAction.coordination_needed && (
                        <div className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2 mb-4">Multi-agency coordination required</div>
                      )}
                      {response.agencyAction.actions.map((a, i) => (
                        <div key={i} className="text-sm text-[#E2E8F0] flex items-start gap-2 mb-2"><ArrowRight className="w-4 h-4 text-[#00D4FF] shrink-0 mt-0.5" /> {a}</div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'emergency' && (
                    <div className="space-y-4">
                      {response.emergencyAction.ems_rerouting_needed && (
                        <div className="text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-4">EMS rerouting required</div>
                      )}
                      {response.emergencyAction.actions.map((a, i) => (
                        <div key={i} className="text-sm text-[#E2E8F0] flex items-start gap-2 mb-2"><Siren className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> {a}</div>
                      ))}

                      {pendingVehicles.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-[#1C2B3A]">
                          <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">Critical Condition Comparison: Ambulance Routing</div>
                          {pendingVehicles.map(v => (
                            <div key={v.id} className="bg-[#07111F] p-4 rounded-lg border border-red-500/30 mb-3">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold text-white flex items-center gap-2"><Siren className="w-4 h-4 text-red-500" /> Ambulance {v.id}</span>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/15 text-red-500">Route Blocked</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-red-500/10 rounded border border-red-500/20">
                                  <div className="text-[9px] font-bold text-red-500 uppercase mb-1">Current Route</div>
                                  <div className="text-xs text-white font-mono mb-2">{v.currentRoute.join(' → ')}</div>
                                  <div className="text-xs text-[#94A3B8]">ETA: <span className="text-red-500 font-bold">{v.currentETA} min</span></div>
                                  <div className="text-[9px] mt-1 text-red-500/80">{v.rerouteReason}</div>
                                </div>
                                <div className="p-3 bg-[#22C55E]/10 rounded border border-[#22C55E]/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                                  <div className="text-[9px] font-bold text-[#22C55E] uppercase mb-1">Recommended Route</div>
                                  <div className="text-xs text-white font-mono mb-2">{v.recommendedRoute!.join(' → ')}</div>
                                  <div className="text-xs text-[#94A3B8]">ETA: <span className="text-[#22C55E] font-bold">{v.projectedETA} min</span></div>
                                  <div className="text-[9px] mt-1 text-[#22C55E]/80">Safe corridor verified</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'public' && (
                    <div className="space-y-4">
                      {incidentAdvisory ? (
                        <div className="bg-[#07111F] p-4 rounded-lg border border-purple-500/30 relative">
                          <div className="flex justify-between items-center mb-4">
                            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Citizen Advisory Preview</div>
                            {incidentAdvisory.status !== 'PUBLISHED' && (
                              <button 
                                onClick={() => setIsEditingAdvisory(!isEditingAdvisory)}
                                className="text-[9px] text-[#64748B] uppercase font-bold tracking-widest hover:text-white transition-colors"
                              >
                                {isEditingAdvisory ? 'Cancel Edit' : 'Edit Advisory'}
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <div className="text-[9px] text-[#64748B] uppercase mb-1">What Happened</div>
                              {isEditingAdvisory ? (
                                <textarea 
                                  value={incidentAdvisory.whatHappened}
                                  onChange={(e) => updateAdvisory(incidentAdvisory.id, { whatHappened: e.target.value })}
                                  className="w-full bg-[#1C2B3A] border border-[#2A3F54] rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                  rows={2}
                                />
                              ) : (
                                <div className="text-sm text-[#E2E8F0]">{incidentAdvisory.whatHappened}</div>
                              )}
                            </div>
                            
                            <div>
                              <div className="text-[9px] text-[#64748B] uppercase mb-1">What To Avoid</div>
                              {isEditingAdvisory ? (
                                <textarea 
                                  value={incidentAdvisory.whatToAvoid}
                                  onChange={(e) => updateAdvisory(incidentAdvisory.id, { whatToAvoid: e.target.value })}
                                  className="w-full bg-[#1C2B3A] border border-[#2A3F54] rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                  rows={2}
                                />
                              ) : (
                                <div className="text-sm text-[#E2E8F0]">{incidentAdvisory.whatToAvoid}</div>
                              )}
                            </div>
                            
                            <div>
                              <div className="text-[9px] text-[#64748B] uppercase mb-1">Alternative</div>
                              {isEditingAdvisory ? (
                                <textarea 
                                  value={incidentAdvisory.alternative}
                                  onChange={(e) => updateAdvisory(incidentAdvisory.id, { alternative: e.target.value })}
                                  className="w-full bg-[#1C2B3A] border border-[#2A3F54] rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                  rows={2}
                                />
                              ) : (
                                <div className="text-sm text-[#E2E8F0]">{incidentAdvisory.alternative}</div>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div><div className="text-[9px] text-[#64748B] uppercase mb-1">Estimated Duration</div><div className="text-sm text-[#E2E8F0]">{incidentAdvisory.estimatedDuration}</div></div>
                              <div><div className="text-[9px] text-[#64748B] uppercase mb-1">Next Update</div><div className="text-sm text-[#E2E8F0]">{incidentAdvisory.nextUpdateTime}</div></div>
                            </div>
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-[#1C2B3A] flex items-center justify-between">
                            <div className="text-[9px] text-[#64748B] italic font-bold">{incidentAdvisory.simulatedLabel}</div>
                            
                            {incidentAdvisory.status !== 'PUBLISHED' ? (
                              <button
                                onClick={() => {
                                  setIsEditingAdvisory(false);
                                  approveAdvisory(incidentAdvisory.id);
                                }}
                                className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/40 rounded text-xs font-bold uppercase tracking-widest hover:bg-purple-500/30 transition-colors flex items-center gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Approve Public Advisory
                              </button>
                            ) : (
                              <div className="px-4 py-2 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Published
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {response.publicAction.actions.map((a, i) => (
                            <div key={i} className="text-sm text-[#E2E8F0] flex items-start gap-2"><Radio className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" /> {a}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'verification' && (
                    <div className="space-y-4">
                      <div className="text-xs text-[#94A3B8] mb-4">Success conditions that must be met to confirm the response worked:</div>
                      {response.verificationConditions.map((v, i) => (
                        <div key={i} className="bg-[#07111F] p-3 rounded-lg border border-[#1C2B3A] flex items-center justify-between">
                          <div>
                            <div className="text-sm text-white font-medium">{v.condition}</div>
                            <div className="text-[10px] text-[#64748B]">Metric: {v.metric}</div>
                          </div>
                          <div className="text-[10px] font-mono text-[#00D4FF] bg-[#00D4FF]/10 px-2 py-1 rounded">{v.threshold}</div>
                        </div>
                      ))}
                      {incidentTickets.length > 0 && (
                        <div className="mt-6">
                          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-3">Action Tickets ({incidentTickets.length})</div>
                          {incidentTickets.map(t => (
                            <div key={t.id} className="bg-[#07111F] p-3 rounded-lg border border-[#1C2B3A] mb-2 flex items-center justify-between">
                              <div>
                                <div className="text-xs text-white font-bold">{t.actionDescription}</div>
                                <div className="text-[10px] text-[#64748B]">{t.responsibleDepartment} · {t.expectedSetupMinutes}min setup</div>
                              </div>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                t.status === 'VERIFIED' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                                t.status === 'FAILED' ? 'bg-red-500/15 text-red-500' :
                                t.status === 'IN_PROGRESS' ? 'bg-[#00D4FF]/15 text-[#00D4FF]' :
                                'bg-[#1C2B3A] text-[#94A3B8]'
                              }`}>{t.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* NO ACTION vs Recommended Comparison */}
              <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-5">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-4">NO ACTION vs COORDINATED RESPONSE</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[9px] text-[#64748B] uppercase mb-1">Cascade Depth</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-red-500">{response.noActionComparison.cascade_depth_no_action}</span>
                      <ArrowRight className="w-3 h-3 text-[#64748B]" />
                      <span className="text-sm font-mono text-[#22C55E]">{response.noActionComparison.cascade_depth_with_action}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#64748B] uppercase mb-1">Population at Risk</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-red-500">{(response.noActionComparison.population_at_risk_no_action / 1000).toFixed(1)}k</span>
                      <ArrowRight className="w-3 h-3 text-[#64748B]" />
                      <span className="text-sm font-mono text-[#22C55E]">{(response.noActionComparison.population_at_risk_with_action / 1000).toFixed(1)}k</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#64748B] uppercase mb-1">Emergency Delay</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-red-500">{response.noActionComparison.emergency_delay_no_action}m</span>
                      <ArrowRight className="w-3 h-3 text-[#64748B]" />
                      <span className="text-sm font-mono text-[#22C55E]">{response.noActionComparison.emergency_delay_with_action}m</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#64748B] uppercase mb-1">Recovery Time</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-red-500">{response.noActionComparison.recovery_time_no_action}m</span>
                      <ArrowRight className="w-3 h-3 text-[#64748B]" />
                      <span className="text-sm font-mono text-[#22C55E]">{response.noActionComparison.recovery_time_with_action}m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="bg-[#0D1B2A]/90 border border-[#1C2B3A] rounded-xl p-5 flex items-center justify-between shadow-lg">
                <div>
                  <div className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mb-1">Status</div>
                  <div className={`text-sm font-bold ${response.status === 'APPROVED' ? 'text-[#22C55E]' : 'text-amber-500'}`}>
                    {response.status === 'APPROVED' ? 'RESPONSE APPROVED' : 'AWAITING APPROVAL'}
                  </div>
                  <div className="text-[9px] text-[#64748B] mt-1">Decision-support prototype. No direct infrastructure control is performed.</div>
                </div>
                
                <button 
                  onClick={handleApproveResponse}
                  disabled={response.status === 'APPROVED'}
                  className="flex items-center gap-2 bg-[#00D4FF] text-[#07111F] px-8 py-3 rounded font-bold hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all disabled:opacity-50 disabled:hover:shadow-none"
                >
                  APPROVE COORDINATED RESPONSE <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-12 text-center text-[#94A3B8]">
              Select an incident to view coordinated response plan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Legacy Planner (shown when no V2 incidents exist) ───────────────────────
function OldPlannerFallback() {
  const { scenario, availableResources, allocatedResources, currentMetrics, noActionBaseline, selectIntervention, selectedInterventionId, approveIntervention } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>(scenario?.interventions[0]?.id || null);

  if (!scenario) return <div className="text-white p-6">No scenario active.</div>;

  const baseline = noActionBaseline || currentMetrics;
  const selectedIntv = scenario.interventions.find(i => i.id === activeTab);

  const isFeasible = (intv: any) => {
    if (!availableResources) return true;
    let feasible = true;
    Object.keys(intv.requiredResources).forEach(key => {
      const k = key as keyof typeof availableResources;
      const netAvail = availableResources[k] - (allocatedResources[k] || 0);
      if (intv.requiredResources[k]! > netAvail) feasible = false;
    });
    return feasible;
  };

  const handleApprove = () => {
    selectIntervention(activeTab);
    approveIntervention();
    navigate('/recovery');
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <h1 className="text-2xl font-extrabold text-white tracking-tight">Response Planner</h1>
      <p className="text-xs text-[#94A3B8]">Evaluate simulated interventions. Start a scenario to see coordinated 5-component responses.</p>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {scenario.interventions.map(intv => (
            <button key={intv.id} onClick={() => setActiveTab(intv.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${activeTab === intv.id ? 'bg-[#00D4FF]/10 border-[#00D4FF]/40' : 'bg-[#0D1B2A]/70 border-[#1C2B3A] hover:border-[#2A3A4C]'}`}>
              <div className="text-sm font-bold text-white mb-1">{intv.title}</div>
              <div className="text-[10px] text-[#94A3B8] whitespace-pre-wrap">{intv.desc}</div>
            </button>
          ))}
        </div>
        <div className="bg-[#0D1B2A] border border-[#1C2B3A] rounded-xl p-6">
          {selectedIntv && (
            <>
              <h2 className="text-lg font-bold text-white mb-4">{selectedIntv.title}</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div><div className="text-[9px] text-[#64748B] uppercase">Impact Reduction</div><div className="text-lg font-bold text-[#00D4FF]">-{selectedIntv.expectedImpactReductionPct}%</div></div>
                <div><div className="text-[9px] text-[#64748B] uppercase">Cascade Reduction</div><div className="text-lg font-bold text-[#00D4FF]">-{selectedIntv.cascadeReduction}</div></div>
                <div><div className="text-[9px] text-[#64748B] uppercase">Feasibility</div><div className="text-lg font-bold text-[#00D4FF]">{selectedIntv.operationalFeasibility}%</div></div>
              </div>
              <button onClick={handleApprove} disabled={!isFeasible(selectedIntv)} className="w-full py-3 bg-[#00D4FF] text-[#07111F] font-bold rounded disabled:opacity-50">
                APPROVE PLAN <ArrowRight className="w-4 h-4 inline ml-2" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
