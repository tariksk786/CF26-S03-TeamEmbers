import { create } from 'zustand';
import type { InfraNode, DepEdge, Scenario, SimulationMetrics, TimelineEvent, NodeStatus, ResourceCounts, Incident, CoordinatedResponse, ActionTicket, PublicAdvisory, IncidentPriority, BusRoute } from '../types';
import { scenarios, baseVehicles, baseBusRoutes, baseAgencyResources, baseWaterNodes, baseTankers } from '../data/mockScenarios';
import { api, connectSimulationWebSocket } from '../lib/api';

// ─── Service State Mappings ──────────────────────────────────────────────────
const SERVICE_STATES: Record<string, Record<string, string>> = {
  power: { OPERATIONAL: 'OPERATIONAL', DEGRADED: 'DEGRADED', FAILED: 'FAILED', RECOVERING: 'RECOVERING' },
  emergency_route: { OPERATIONAL: 'OPEN', DEGRADED: 'DEGRADED', FAILED: 'BLOCKED', RECOVERING: 'PARTIALLY_OPEN' },
  traffic: { OPERATIONAL: 'NORMAL', DEGRADED: 'CONGESTED', FAILED: 'CRITICAL', RECOVERING: 'STABILIZING' },
  hospital: { OPERATIONAL: 'NORMAL', DEGRADED: 'CAPACITY_CONSTRAINED', FAILED: 'CAPACITY_CONSTRAINED', RECOVERING: 'RECOVERING', PREDICTED_RISK: 'DEGRADED' },
  telecom: { OPERATIONAL: 'CONNECTED', DEGRADED: 'DEGRADED', FAILED: 'PARTIAL_OUTAGE', RECOVERING: 'RESTORING', UNKNOWN: 'UNKNOWN' },
  water: { OPERATIONAL: 'NORMAL', DEGRADED: 'LOW_PRESSURE', FAILED: 'OUTAGE', RECOVERING: 'RESTORING' },
  fire_station: { OPERATIONAL: 'AVAILABLE', DEGRADED: 'RESOURCE_CONSTRAINED', FAILED: 'CRITICAL_SHORTAGE', RECOVERING: 'RECOVERING' },
  ambulance_station: { OPERATIONAL: 'AVAILABLE', DEGRADED: 'RESOURCE_CONSTRAINED', FAILED: 'CRITICAL_SHORTAGE', RECOVERING: 'RECOVERING' },
};
const getServiceState = (type: string, status: string) => SERVICE_STATES[type]?.[status] || status;

const TYPE_CATEGORY: Record<string, string> = {
  power: 'POWER', traffic: 'TRAFFIC', hospital: 'HOSPITAL', telecom: 'TELECOM',
  water: 'WATER', fire_station: 'FIRE_EMS', ambulance_station: 'FIRE_EMS',
  emergency_route: 'ROAD', bridge: 'ROAD', shelter: 'HOSPITAL',
};
const getCategory = (type: string) => TYPE_CATEGORY[type] || 'POWER';

const AGENCY_MAP: Record<string, string> = {
  POWER: 'Power Utility', ROAD: 'Municipal Road/Drainage', TRAFFIC: 'Traffic Control',
  HOSPITAL: 'Hospital/Health Operations', TELECOM: 'Telecom Operations',
  WATER: 'Water Utility', FIRE_EMS: 'EMS / Fire Service',
};

const CRITICAL_TYPES = new Set(['hospital', 'water', 'fire_station', 'ambulance_station', 'telecom']);

interface SimStore {
  scenario: Scenario | null;
  nodes: Record<string, InfraNode>;
  edges: DepEdge[];
  availableResources: ResourceCounts;
  allocatedResources: ResourceCounts;
  vehicles: typeof baseVehicles;
  clock: number;
  clockLabel: string;
  isPlaying: boolean;
  speed: number;
  telemetryMode: 100 | 90 | 70 | 50;
  currentMetrics: SimulationMetrics;
  noActionBaseline: SimulationMetrics | null;
  predictedNode: { id: string; probability: number | string; reasoning: string[] } | null;
  selectedInterventionId: string | null;
  approvedInterventionId: string | null;
  eventTimeline: TimelineEvent[];
  demoActive: boolean;
  demoTimer: ReturnType<typeof setInterval> | null;
  backendConnected: boolean;
  simId: string | null;
  ws: WebSocket | null;

  // V2 State
  incidents: Incident[];
  coordinatedResponses: Record<string, CoordinatedResponse>;
  actionTickets: ActionTicket[];
  publicAdvisories: PublicAdvisory[];
  busRoutes: BusRoute[];
  agencyResources: typeof baseAgencyResources;
  waterNodes: typeof baseWaterNodes;
  tankers: typeof baseTankers;
  verificationResults: any[];
  reassessmentNeeded: boolean;

  // Actions
  loadScenario: (id: string) => void;
  setTelemetryMode: (mode: 100 | 90 | 70 | 50) => void;
  advanceClock: (seconds?: number) => void;
  togglePlay: () => void;
  setSpeed: (s: number) => void;
  reset: () => void;
  selectIntervention: (id: string | null) => void;
  approveIntervention: () => void;
  start60sDemo: () => void;
  stopDemo: () => void;
  manualOverride: (nodeId: string, status: NodeStatus) => void;
  connectBackend: () => Promise<void>;

  // V2 Actions
  injectDisruption: (nodeId: string, disruptionType: string, severity: number) => void;
  acknowledgeTicket: (ticketId: string) => void;
  completeTicket: (ticketId: string) => void;
  approveAdvisory: (advisoryId: string) => void;
  approveCoordinatedResponse: (responseId: string) => void;
}

const formatTime = (scenarioStart: string, offsetSec: number) => {
  const [h, m, s] = scenarioStart.split(':').map(Number);
  const total = (h * 3600) + (m * 60) + (s || 0) + offsetSec;
  const nh = Math.floor(total / 3600) % 24;
  const nm = Math.floor((total % 3600) / 60);
  const ns = total % 60;
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}:${String(ns).padStart(2,'0')}`;
};

const calcMetrics = (nodes: Record<string, InfraNode>, eventsToDate: number): SimulationMetrics => {
  let cascadeDepth = Math.floor(eventsToDate / 2);
  let affectedServices = 0;
  let criticalFacilitiesAffected = 0;
  let populationExposed = 0;
  let populationAtRisk = 0;
  let emergencyCount = 0;
  let totalConf = 0, confCount = 0;
  let recoveringCount = 0, totalAffected = 0;
  
  Object.values(nodes).forEach(n => {
    if (n.status === 'FAILED' || n.status === 'DEGRADED') {
      affectedServices++;
      totalAffected++;
      populationExposed += n.populationServed;
      if (n.status === 'FAILED') {
        populationAtRisk += n.populationServed;
        emergencyCount++;
      }
      if (CRITICAL_TYPES.has(n.type)) criticalFacilitiesAffected++;
    } else if (n.status === 'PREDICTED_RISK') {
      if (CRITICAL_TYPES.has(n.type)) criticalFacilitiesAffected++;
      totalAffected++;
    } else if (n.status === 'RECOVERING') {
      recoveringCount++;
      totalAffected++;
    }
    totalConf += n.dataConfidence || 100;
    confCount++;
  });

  const emergencyDelayMin = affectedServices * 3;
  const resilienceScore = Math.max(0, 100 - (affectedServices * 12));
  const impact = (populationAtRisk / 150000) * 40 + (criticalFacilitiesAffected * 15) + emergencyDelayMin;
  const lifeSafetyImpactScore = Math.min(100, Math.max(0, Math.round(impact)));
  const risk = (cascadeDepth * 10) + (criticalFacilitiesAffected * 20) + (emergencyCount * 15);
  const riskScore = Math.min(100, Math.max(0, Math.round(risk)));

  return {
    populationExposed, populationAtRisk, criticalFacilitiesAffected, emergencyCount,
    cascadeDepth, emergencyDelayMin, resilienceScore, lifeSafetyImpactScore, riskScore,
    emergencyAccessibility: Math.max(0, 100 - affectedServices * 15 - cascadeDepth * 5),
    networkCongestion: Math.min(100, affectedServices * 12 + cascadeDepth * 8),
    dataConfidence: confCount > 0 ? Math.round(totalConf / confCount) : 100,
    recoveryProgress: totalAffected > 0 ? Math.round(recoveringCount / totalAffected * 100) : 100,
    waterServiceAvailability: 100, // Updated by water engine
    recoveryTimeMin: totalAffected * 30,
  };
};

// ─── V2: Priority Assessment ─────────────────────────────────────────────────
function assessIncident(nodeId: string, nodes: Record<string, InfraNode>, edges: DepEdge[]): Incident | null {
  const node = nodes[nodeId];
  if (!node || node.status === 'OPERATIONAL' || node.status === 'RECOVERING') return null;

  const category = getCategory(node.type);
  const isCritical = CRITICAL_TYPES.has(node.type);
  const downstream = edges.filter(e => e.source === nodeId).map(e => e.target);
  const downstreamAtRisk = downstream.filter(d => nodes[d] && ['OPERATIONAL','DEGRADED'].includes(nodes[d].status));
  
  let lifeSafety = (isCritical ? 40 : 0) + (node.status === 'FAILED' ? 30 : 15) + Math.min(30, node.populationServed / 5000);
  lifeSafety = Math.min(100, lifeSafety);
  const cascadeRisk = Math.min(100, downstreamAtRisk.length * 15);
  const timeToCritical = node.status === 'FAILED' && !node.backupAvailable ? 5 : node.status === 'FAILED' ? Math.max(5, node.backupDurationMin || 30) : 30;
  const conf = (node.dataConfidence > 1 ? node.dataConfidence / 100 : node.dataConfidence) || 1;
  const recoveryLeverage = downstreamAtRisk.length;
  const emergencyAccess = (node.type === 'emergency_route' || node.type === 'traffic') ? 60 : node.type === 'hospital' ? 80 : 0;

  const score = lifeSafety * 0.25 + cascadeRisk * 0.15 + emergencyAccess * 0.15 + (100 - timeToCritical) * 0.15 + node.criticalityScore * 0.10 + recoveryLeverage * 5 * 0.10 + (1 - conf) * 50 * 0.05 + Math.min(100, node.populationServed / 1000) * 0.05;
  
  let priority: IncidentPriority = score >= 65 || (node.status === 'FAILED' && isCritical) ? 'P1' : score >= 45 ? 'P2' : score >= 25 ? 'P3' : 'P4';

  const whyParts: string[] = [];
  if (lifeSafety >= 40) whyParts.push(`Critical facility at risk`);
  if (cascadeRisk >= 30) whyParts.push(`${downstreamAtRisk.length} downstream services at risk`);
  if (timeToCritical <= 15) whyParts.push(`Time to critical: ${timeToCritical} min`);
  if (emergencyAccess >= 40) whyParts.push(`Emergency accessibility affected`);
  if (recoveryLeverage >= 3) whyParts.push(`Recovery leverage: ${recoveryLeverage}`);

  return {
    id: `INC-${nodeId}`,
    nodeId,
    priority,
    score: Math.round(score * 10) / 10,
    status: 'UNASSIGNED',
    title: `${node.name} — ${getServiceState(node.type, node.status)}`,
    category: category as any,
    lifeSafetyImpact: Math.round(lifeSafety * 10) / 10,
    populationAffected: node.populationServed,
    cascadeGrowthRisk: Math.round(cascadeRisk * 10) / 10,
    timeToCriticalMinutes: timeToCritical,
    dataConfidence: Math.round(conf * 100) / 100,
    recoveryLeverage,
    emergencyAccessImpact: emergencyAccess,
    serviceState: getServiceState(node.type, node.status),
    responsibleAgency: AGENCY_MAP[category] || 'Municipal Operations',
    whyPriority: whyParts.join(' | ') || `Score ${Math.round(score)} based on weighted assessment`,
    downstreamEffects: downstreamAtRisk.slice(0, 10),
  };
}

function generateCoordinatedResponse(incident: Incident, nodes: Record<string, InfraNode>): CoordinatedResponse {
  const node = nodes[incident.nodeId] || {} as InfraNode;
  const cat = incident.category;
  
  const INFRA_ACTIONS: Record<string, { description: string; setup_time_minutes: number; required_resources: Record<string,number>; feasibility: string }[]> = {
    POWER: [{ description: 'Deploy mobile generator to affected substation', setup_time_minutes: 12, required_resources: { generators: 1 }, feasibility: 'HIGH' }, { description: 'Activate backup power switching', setup_time_minutes: 5, required_resources: {}, feasibility: 'HIGH' }],
    ROAD: [{ description: 'Deploy drainage/pumping response', setup_time_minutes: 20, required_resources: { drainage_teams: 1 }, feasibility: 'MEDIUM' }, { description: 'Restrict entry to affected road', setup_time_minutes: 5, required_resources: { traffic_teams: 1 }, feasibility: 'HIGH' }, { description: 'Activate distributed rerouting', setup_time_minutes: 10, required_resources: { traffic_teams: 2 }, feasibility: 'HIGH' }],
    TRAFFIC: [{ description: 'Deploy traffic officers for manual control', setup_time_minutes: 8, required_resources: { traffic_teams: 2 }, feasibility: 'HIGH' }, { description: 'Implement temporary signal timing changes', setup_time_minutes: 5, required_resources: { traffic_teams: 1 }, feasibility: 'HIGH' }],
    HOSPITAL: [{ description: 'Activate backup generator', setup_time_minutes: 2, required_resources: {}, feasibility: 'HIGH' }, { description: 'Initiate patient load redistribution', setup_time_minutes: 15, required_resources: {}, feasibility: 'MEDIUM' }],
    TELECOM: [{ description: 'Deploy mobile communication unit', setup_time_minutes: 15, required_resources: { repair_crews: 1 }, feasibility: 'MEDIUM' }, { description: 'Switch to last-known-state telemetry', setup_time_minutes: 1, required_resources: {}, feasibility: 'HIGH' }],
    WATER: [{ description: 'Isolate failed section', setup_time_minutes: 8, required_resources: { repair_crews: 1 }, feasibility: 'HIGH' }, { description: 'Deploy tanker resources', setup_time_minutes: 20, required_resources: { tankers: 2 }, feasibility: 'MEDIUM' }, { description: 'Protect hospital/fire reserves', setup_time_minutes: 5, required_resources: { tankers: 1 }, feasibility: 'HIGH' }],
    FIRE_EMS: [{ description: 'Redistribute emergency vehicles', setup_time_minutes: 5, required_resources: {}, feasibility: 'HIGH' }],
  };
  const EMERGENCY: Record<string, string[]> = {
    POWER: ['Verify hospital backup status', 'Reroute EMS from signal-failure zones'], ROAD: ['Activate alternate emergency route', 'Pre-position ambulances at safe corridors'],
    TRAFFIC: ['Implement emergency signal override', 'Deploy officers at critical junctions'], HOSPITAL: ['Redirect ambulances to alternate facility', 'Assess route reliability'],
    TELECOM: ['Switch to radio-based dispatch', 'Alert EMS of communication gaps'], WATER: ['Protect hospital/fire reserves', 'Verify fire hydrant availability'],
    FIRE_EMS: ['Coordinate mutual aid coverage', 'Prioritize life-threatening calls'],
  };
  const PUBLIC: Record<string, string[]> = {
    POWER: ['Be aware of potential traffic signal outages', 'Conserve device battery'], ROAD: ['Avoid the affected road', 'Use recommended alternate corridors', 'Expect delays on nearby roads'],
    TRAFFIC: ['Expect delays at affected junctions', 'Allow extra travel time'], HOSPITAL: ['Non-emergency visits may experience delays'],
    TELECOM: ['Communication services may be intermittent'], WATER: ['Conserve water usage', 'Collect emergency water from distribution points if needed'],
    FIRE_EMS: ['Call emergency services only for genuine emergencies'],
  };
  const VERIFY: Record<string, { metric: string; condition: string; threshold: string }[]> = {
    POWER: [{ metric: 'power_restored', condition: 'Downstream nodes receive stable power', threshold: '>90%' }, { metric: 'backup_stable', condition: 'Backups stop draining', threshold: 'stable' }],
    ROAD: [{ metric: 'throughput', condition: 'Throughput above threshold', threshold: '>70%' }, { metric: 'emergency_eta', condition: 'Emergency ETA normalized', threshold: '<15min' }],
    TRAFFIC: [{ metric: 'congestion', condition: 'Congestion below threshold', threshold: '<60%' }], HOSPITAL: [{ metric: 'capacity', condition: 'Capacity restored', threshold: '>30%' }],
    TELECOM: [{ metric: 'telemetry', condition: 'Telemetry sources reconnect', threshold: '>80%' }], WATER: [{ metric: 'pressure', condition: 'Pressure above minimum', threshold: '>60%' }],
    FIRE_EMS: [{ metric: 'response_time', condition: 'Response times normalized', threshold: '<10min' }],
  };

  const pop = incident.populationAffected;
  const ds = incident.downstreamEffects.length;
  return {
    id: `cr-${incident.id}`,
    incidentId: incident.id,
    incidentTitle: incident.title,
    priority: incident.priority,
    category: incident.category,
    infrastructureAction: { target: node.name || incident.nodeId, actions: INFRA_ACTIONS[cat] || INFRA_ACTIONS.POWER },
    agencyAction: { primary_agency: incident.responsibleAgency, actions: [`${incident.responsibleAgency}: Lead response`, 'Traffic Control: Coordinate diversions if needed'], coordination_needed: incident.priority === 'P1' || incident.priority === 'P2' },
    emergencyAction: { actions: EMERGENCY[cat] || [], ems_rerouting_needed: cat === 'ROAD' || cat === 'TRAFFIC' },
    publicAction: { advisory_needed: incident.priority !== 'P4', actions: PUBLIC[cat] || [], affected_area: node.zone || 'Affected Zone', severity: incident.priority },
    verificationConditions: VERIFY[cat] || [],
    noActionComparison: { cascade_depth_no_action: ds + 2, cascade_depth_with_action: Math.max(0, ds - 1), population_at_risk_no_action: pop, population_at_risk_with_action: Math.round(pop * 0.3), emergency_delay_no_action: 25 + ds * 5, emergency_delay_with_action: 8, recovery_time_no_action: 120 + ds * 30, recovery_time_with_action: 45 },
    status: 'PROPOSED',
  };
}

function generatePublicAdvisory(incident: Incident, _nodes: Record<string, InfraNode>, clockLabel: string): PublicAdvisory | null {
  if (incident.priority === 'P4') return null;
  const cat = incident.category;
  const TEMPLATES: Record<string, { what: string; avoid: string; alt: string }> = {
    ROAD: { what: `temporarily closed due to operational conditions`, avoid: `Avoid the affected area`, alt: `Use recommended alternate corridors` },
    WATER: { what: `Reduced water supply in affected zone`, avoid: `Conserve water; minimize non-essential usage`, alt: `Emergency tanker supply is being arranged` },
    POWER: { what: `Power supply disruption affecting the zone`, avoid: `Be cautious at traffic signals`, alt: `Backup systems are active where available` },
    TRAFFIC: { what: `Traffic signal disruption`, avoid: `Expect delays at affected junctions`, alt: `Follow traffic officer guidance` },
    TELECOM: { what: `Communication services partially disrupted`, avoid: `Some services may be intermittent`, alt: `Use alternate communication methods` },
    HOSPITAL: { what: `Operating at reduced capacity`, avoid: `Non-emergency visits may experience delays`, alt: `Consider alternate facilities for non-urgent needs` },
    FIRE_EMS: { what: `Emergency response times may be extended`, avoid: `Call only for genuine emergencies`, alt: `Additional units being mobilized` },
  };
  const t = TEMPLATES[cat] || TEMPLATES.ROAD;
  const name = incident.title.split('—')[0].trim();
  return {
    id: `adv-${incident.id}`, incidentId: incident.id, advisoryType: cat, severity: incident.priority,
    affectedArea: 'Affected Zone', whatHappened: `${name} ${t.what}`, whatToAvoid: t.avoid, alternative: t.alt,
    estimatedDuration: incident.priority === 'P1' ? 'Duration uncertain — updates every 15 minutes' : 'Expected duration: 1-2 hours',
    nextUpdateTime: incident.priority === 'P1' ? 'Next update in 15 minutes' : 'Next update in 30 minutes',
    status: 'DRAFT', isSimulated: true, simulatedLabel: 'SIMULATED PROTOTYPE ADVISORY',
  };
}

function generateActionTickets(incident: Incident, response: CoordinatedResponse): ActionTicket[] {
  const tickets: ActionTicket[] = [];
  for (const action of response.infrastructureAction.actions) {
    tickets.push({
      id: `TKT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      incidentId: incident.id, priority: incident.priority,
      responsibleDepartment: response.agencyAction.primary_agency,
      actionDescription: action.description, targetAssetId: incident.nodeId,
      targetAssetName: incident.title.split('—')[0].trim(),
      requiredResources: action.required_resources, expectedSetupMinutes: action.setup_time_minutes,
      status: 'GENERATED', verificationCondition: response.verificationConditions,
      createdAt: new Date().toISOString(),
    });
  }
  for (const desc of response.emergencyAction.actions.slice(0, 2)) {
    tickets.push({
      id: `TKT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      incidentId: incident.id, priority: incident.priority,
      responsibleDepartment: 'EMS / Fire Service',
      actionDescription: desc, targetAssetId: incident.nodeId,
      targetAssetName: incident.title.split('—')[0].trim(),
      requiredResources: {}, expectedSetupMinutes: 5,
      status: 'GENERATED', verificationCondition: [],
      createdAt: new Date().toISOString(),
    });
  }
  return tickets;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const defaultScenario = scenarios['compound-demo'];

export const useStore = create<SimStore>((set, get) => ({
  scenario: defaultScenario,
  nodes: JSON.parse(JSON.stringify(defaultScenario.initialNodes)),
  edges: JSON.parse(JSON.stringify(defaultScenario.initialEdges)),
  availableResources: { ...defaultScenario.availableResources },
  allocatedResources: { mobileGenerators: 0, trafficUnits: 0, repairCrews: 0, ambulances: 0, fireUnits: 0 },
  vehicles: [...baseVehicles],
  clock: 0, clockLabel: defaultScenario.startTime, isPlaying: false, speed: 1,
  telemetryMode: 100,
  currentMetrics: calcMetrics(defaultScenario.initialNodes, 0),
  noActionBaseline: null, predictedNode: null,
  selectedInterventionId: null, approvedInterventionId: null,
  eventTimeline: [{ id: 'evt-init', timestamp: defaultScenario.startTime, type: 'SIMULATED', entity: 'SYSTEM', status: 'OPERATIONAL', desc: `Loaded Scenario: Compound Urban Crisis` }],
  demoActive: false, demoTimer: null, backendConnected: false, simId: null, ws: null,

  // V2 defaults
  incidents: [], coordinatedResponses: {}, actionTickets: [], publicAdvisories: [],
  busRoutes: [...baseBusRoutes], agencyResources: [...baseAgencyResources],
  waterNodes: [...baseWaterNodes], tankers: [...baseTankers],
  verificationResults: [], reassessmentNeeded: false,

  loadScenario: (id) => {
    const sc = scenarios[id];
    if (!sc) return;
    set({
      scenario: sc,
      nodes: JSON.parse(JSON.stringify(sc.initialNodes)),
      edges: JSON.parse(JSON.stringify(sc.initialEdges)),
      availableResources: { ...sc.availableResources },
      allocatedResources: { mobileGenerators: 0, trafficUnits: 0, repairCrews: 0, ambulances: 0, fireUnits: 0 },
      vehicles: JSON.parse(JSON.stringify(baseVehicles)),
      clock: 0, clockLabel: sc.startTime, isPlaying: false, telemetryMode: 100,
      currentMetrics: calcMetrics(sc.initialNodes, 0),
      noActionBaseline: null, predictedNode: null,
      selectedInterventionId: null, approvedInterventionId: null,
      eventTimeline: [{ id: 'evt-init', timestamp: sc.startTime, type: 'SIMULATED', entity: 'SYSTEM', status: 'OPERATIONAL', desc: `Loaded Scenario: ${sc.name}` }],
      demoActive: false, demoTimer: null,
      // V2 reset
      incidents: [], coordinatedResponses: {}, actionTickets: [], publicAdvisories: [],
      busRoutes: [...baseBusRoutes], verificationResults: [], reassessmentNeeded: false,
    });
  },

  setTelemetryMode: (mode) => {
    const { nodes } = get();
    const newNodes = { ...nodes };
    // Apply telecom-confidence degradation
    if (mode < 100) {
      Object.values(newNodes).forEach(n => {
        if (n.type !== 'telecom') {
          newNodes[n.id] = { ...n, dataConfidence: Math.round(n.dataConfidence * (mode / 100)) };
        }
      });
    }
    set({ telemetryMode: mode, nodes: newNodes });
  },

  advanceClock: (seconds = 1) => {
    const { scenario, clock, nodes, eventTimeline, edges } = get();
    if (!scenario) return;
    
    const nextClock = clock + seconds;
    const newNodes = { ...nodes };
    const newTimeline = [...eventTimeline];
    let newVehicles = [...get().vehicles];
    
    // Process timed events
    const events = scenario.timedEvents.filter(e => e.t > clock && e.t <= nextClock);
    events.forEach((ev, i) => {
      if (ev.nodeId && newNodes[ev.nodeId]) {
        const oldStatus = newNodes[ev.nodeId].status;
        newNodes[ev.nodeId] = { ...newNodes[ev.nodeId], status: ev.newStatus || newNodes[ev.nodeId].status, serviceState: getServiceState(newNodes[ev.nodeId].type, ev.newStatus || newNodes[ev.nodeId].status) };
      }
      newTimeline.push({
        id: `evt-${nextClock}-${i}`, timestamp: formatTime(scenario.startTime, ev.t),
        type: ev.evidence === 'PREDICTED' ? 'PREDICTED' : 'OBSERVED',
        entity: ev.nodeId ? newNodes[ev.nodeId]?.name || ev.nodeId : (ev.edgeId || 'SYSTEM'),
        status: ev.newStatus || 'UNKNOWN', desc: ev.desc, confidence: ev.evidence === 'PREDICTED' ? 84 : 100
      });
    });

    // ─── Cascade propagation ─────────────────────────────────────────
    edges.forEach(e => {
      const src = newNodes[e.source], tgt = newNodes[e.target];
      if (!src || !tgt) return;
      if (tgt.status === 'FAILED') return;
      if (src.status === 'FAILED' || src.status === 'DEGRADED') {
        if (e.strength < 0.3) return;
        if (src.status === 'DEGRADED' && src.capacity >= e.minCapacityReq) return;
        if (e.fallbackAvailable || (tgt.backupAvailable && (tgt.backupDurationMin || 0) > 0)) {
          if (tgt.status === 'OPERATIONAL') {
            newNodes[tgt.id] = { ...tgt, status: 'DEGRADED', serviceState: getServiceState(tgt.type, 'DEGRADED') };
          }
        } else if (tgt.status !== 'FAILED') {
          newNodes[tgt.id] = { ...tgt, status: 'FAILED', serviceState: getServiceState(tgt.type, 'FAILED') };
        }
      }
    });

    // ─── Compound interaction rules ──────────────────────────────────
    if (scenario.compoundRules) {
      for (const rule of scenario.compoundRules) {
        const allMet = rule.conditions.every(c => Object.values(newNodes).some(n => n.type === c.type && n.status === c.status));
        if (allMet) {
          Object.values(newNodes).forEach(n => {
            if (n.type === rule.effect.targetType && (n.status === 'OPERATIONAL' || n.status === 'DEGRADED')) {
              if (rule.effect.capacityMultiplier < 0.5 && n.status !== 'DEGRADED') {
                newNodes[n.id] = { ...n, status: 'DEGRADED', serviceState: getServiceState(n.type, 'DEGRADED') };
              }
            }
          });
        }
      }
    }

    // ─── Telecom failure → confidence degradation ────────────────────
    const telecomFailed = Object.values(newNodes).some(n => n.type === 'telecom' && (n.status === 'FAILED' || n.status === 'DEGRADED'));
    if (telecomFailed) {
      Object.values(newNodes).forEach(n => {
        if (n.type !== 'telecom' && n.dataConfidence > 50) {
          newNodes[n.id] = { ...n, dataConfidence: Math.max(40, n.dataConfidence - 15) };
        }
      });
    }

    // Vehicle route evaluation (preserved from original)
    newVehicles = newVehicles.map(v => {
      if (v.approvalStatus === 'APPROVED') return v;
      let isBlocked = false, isDegraded = false, blockingNode = '';
      const nodeMap: Record<string, string> = { 'R-17': 'ER-01', 'J-17': 'TJ-01', 'H-01': 'HO-01', 'D-1': 'DR-01' };
      v.currentRoute.forEach(r => {
        const nodeId = nodeMap[r] || r;
        if (newNodes[nodeId]) {
          if (newNodes[nodeId].status === 'FAILED') { isBlocked = true; blockingNode = r; }
          else if (newNodes[nodeId].status === 'DEGRADED') isDegraded = true;
        }
      });
      if (isBlocked && v.routeState !== 'BLOCKED') return { ...v, routeState: 'BLOCKED' as const, interventionNeed: 'CRITICAL' as const, currentETA: 20, rerouteReason: `${blockingNode} failed`, recommendedRoute: ['R-12', 'R-21', 'J-09', 'H-01'], projectedETA: 9, recommendedRouteStatus: 'SAFE' as const, approvalStatus: 'PENDING' as const };
      if (isDegraded && !isBlocked) return { ...v, routeState: 'DEGRADED' as const, currentETA: v.normalETA + 5 };
      return v;
    });

    // ─── V2: Incident Assessment & Priority ──────────────────────────
    const existingIncidentIds = new Set(get().incidents.map(i => i.id));
    const newIncidents: Incident[] = [...get().incidents];
    const newResponses = { ...get().coordinatedResponses };
    const newTickets = [...get().actionTickets];
    const newAdvisories = [...get().publicAdvisories];

    // Assess all affected nodes for incidents
    Object.keys(newNodes).forEach(nid => {
      const incId = `INC-${nid}`;
      if (!existingIncidentIds.has(incId) && ['FAILED', 'DEGRADED', 'PREDICTED_RISK'].includes(newNodes[nid].status)) {
        const inc = assessIncident(nid, newNodes, edges);
        if (inc) {
          newIncidents.push(inc);
          existingIncidentIds.add(incId);
          // Generate coordinated response
          const resp = generateCoordinatedResponse(inc, newNodes);
          newResponses[incId] = resp;
          // Generate action tickets
          const tickets = generateActionTickets(inc, resp);
          newTickets.push(...tickets);
          // Generate public advisory
          const adv = generatePublicAdvisory(inc, newNodes, formatTime(scenario.startTime, nextClock));
          if (adv) newAdvisories.push(adv);
        }
      }
    });

    // Reassess existing incidents
    for (const inc of newIncidents) {
      if (inc.status === 'RESOLVED') continue;
      const node = newNodes[inc.nodeId];
      if (!node) continue;
      if (node.status === 'OPERATIONAL' || node.status === 'RECOVERING') {
        inc.status = 'STABILIZING';
        if (node.status === 'OPERATIONAL') inc.status = 'RESOLVED';
      }
    }

    // Sort by priority
    const priorityOrder = { P1: 0, P2: 1, P3: 2, P4: 3 };
    newIncidents.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4) || b.score - a.score);

    // Group by root cause (deduplicate)
    const rootIncidents = newIncidents.filter(i => !i.rootCauseIncidentId);
    for (const root of rootIncidents) {
      const downstream = edges.filter(e => e.source === root.nodeId).map(e => e.target);
      root.downstreamIncidents = newIncidents.filter(i => i.id !== root.id && downstream.includes(i.nodeId));
      root.isRoot = true;
      for (const child of (root.downstreamIncidents || [])) {
        child.rootCauseIncidentId = root.id;
      }
    }

    // ─── Recovery verification for in-progress tickets ───────────────
    const verResults: any[] = [];
    const seenTargets = new Set<string>();
    
    for (const ticket of newTickets) {
      if (ticket.status === 'IN_PROGRESS' || ticket.status === 'COMPLETED') {
        if (seenTargets.has(ticket.targetAssetId)) continue;
        seenTargets.add(ticket.targetAssetId);
        
        const targetNode = newNodes[ticket.targetAssetId];
        if (targetNode && (targetNode.status === 'OPERATIONAL' || targetNode.status === 'RECOVERING')) {
          verResults.push({ ticketId: ticket.id, target: ticket.targetAssetId, verified: true, recommendation: 'STABILIZING' });
        } else if (targetNode) {
          verResults.push({ ticketId: ticket.id, target: ticket.targetAssetId, verified: false, recommendation: 'REASSESS' });
        }
      }
    }

    const metrics = calcMetrics(newNodes, scenario.timedEvents.filter(e => e.t <= nextClock).length);

    // No Action baseline
    let noAction = get().noActionBaseline;
    if (nextClock > 15 && !noAction) {
      const finalNodes = JSON.parse(JSON.stringify(newNodes));
      scenario.timedEvents.filter(e => e.t > nextClock).forEach(ev => {
        if (ev.nodeId && finalNodes[ev.nodeId]) finalNodes[ev.nodeId].status = ev.newStatus || finalNodes[ev.nodeId].status;
      });
      noAction = calcMetrics(finalNodes, scenario.timedEvents.length);
    }

    // Prediction logic
    let predicted = get().predictedNode;
    if (nextClock >= 30 && !predicted) {
      predicted = {
        id: 'HO-01', probability: get().telemetryMode === 100 ? 84 : '63-81',
        reasoning: ['J-17 traffic throughput < 30%', 'Road R-17 blocked', 'Alternative route degraded', `Traffic data confidence = ${get().telemetryMode}%`]
      };
    }

    // Bus route impact
    const affectedRoads = new Set(Object.values(newNodes).filter(n => (n.type === 'emergency_route' || n.type === 'bridge') && n.status === 'FAILED').map(n => n.id));
    const updatedBusRoutes = get().busRoutes.map(br => {
      const affected = br.roadSegments.filter(s => affectedRoads.has(s));
      if (affected.length > 0) return { ...br, status: 'DIVERTED', delayMinutes: 10, diversionInfo: `Diverted around ${affected.length} affected section(s)` };
      return br;
    });

    set({
      clock: nextClock, clockLabel: formatTime(scenario.startTime, nextClock),
      nodes: newNodes, vehicles: newVehicles, currentMetrics: metrics,
      noActionBaseline: noAction, predictedNode: predicted, eventTimeline: newTimeline,
      incidents: newIncidents, coordinatedResponses: newResponses,
      actionTickets: newTickets, publicAdvisories: newAdvisories,
      busRoutes: updatedBusRoutes, verificationResults: verResults,
      reassessmentNeeded: verResults.some(v => !v.verified),
    });
  },

  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),
  setSpeed: (s) => set({ speed: s }),
  
  reset: () => {
    const { scenario, demoTimer } = get();
    if (demoTimer) clearInterval(demoTimer);
    if (scenario) get().loadScenario(scenario.scenarioId);
  },

  selectIntervention: (id) => set({ selectedInterventionId: id }),

  approveIntervention: () => {
    const { scenario, selectedInterventionId, approvedInterventionId, clockLabel, eventTimeline, allocatedResources, actionTickets, nodes } = get();
    if (!scenario || !selectedInterventionId || approvedInterventionId === selectedInterventionId) return;
    const intv = scenario.interventions.find(i => i.id === selectedInterventionId);
    if (!intv) return;

    const newAllocated = { ...allocatedResources };
    if (intv.requiredResources.trafficUnits) newAllocated.trafficUnits += intv.requiredResources.trafficUnits;
    if (intv.requiredResources.ambulances) newAllocated.ambulances += intv.requiredResources.ambulances;
    if (intv.requiredResources.mobileGenerators) newAllocated.mobileGenerators += intv.requiredResources.mobileGenerators;
    if (intv.requiredResources.repairCrews) newAllocated.repairCrews += intv.requiredResources.repairCrews;

    const eventsToAdd: TimelineEvent[] = [{
      id: `evt-intv-${Date.now()}`, timestamp: clockLabel, type: 'INTERVENTION',
      entity: 'LIFEGRID SYSTEM', status: 'ACTIVE', desc: `Approved Plan: ${intv.title}`, confidence: intv.operationalFeasibility
    }];

    const newVehicles = get().vehicles.map(v => {
      if (v.approvalStatus === 'PENDING' && v.recommendedRoute) {
        eventsToAdd.push({ id: `evt-intv-route-${v.id}`, timestamp: formatTime(scenario.startTime, get().clock + 2), type: 'INTERVENTION', entity: `Ambulance ${v.id}`, status: 'REROUTED', desc: `${v.id} rerouted via ${v.recommendedRoute[1]}.`, confidence: 100 });
        return { ...v, currentRoute: v.recommendedRoute, currentETA: v.projectedETA || v.normalETA, routeState: 'CLEAR' as const, corridorStatus: 'ACTIVE' as const, approvalStatus: 'APPROVED' as const };
      }
      return v;
    });

    // Advance tickets to IN_PROGRESS
    const updatedTickets = actionTickets.map(t => t.status === 'GENERATED' ? { ...t, status: 'IN_PROGRESS' as const } : t);

    // Update incident statuses
    const updatedIncidents = get().incidents.map(inc => ({ ...inc, status: (inc.status === 'UNASSIGNED' ? 'IN_PROGRESS' : inc.status) as any }));

    // Update node statuses to RECOVERING for all FAILED/DEGRADED nodes
    const newNodes = { ...nodes };
    Object.keys(newNodes).forEach(nid => {
      if (['FAILED', 'DEGRADED', 'PREDICTED_RISK'].includes(newNodes[nid].status)) {
        newNodes[nid] = { ...newNodes[nid], status: 'RECOVERING', serviceState: getServiceState(newNodes[nid].type, 'RECOVERING') };
      }
    });

    set({
      approvedInterventionId: selectedInterventionId, allocatedResources: newAllocated,
      vehicles: newVehicles, eventTimeline: [...eventTimeline, ...eventsToAdd],
      actionTickets: updatedTickets, incidents: updatedIncidents, nodes: newNodes,
    });

    setTimeout(() => { get().advanceClock(10); }, 1000);
  },

  start60sDemo: async () => {
    const { backendConnected } = get();
    get().loadScenario('compound-demo');
    set({ demoActive: true });
    
    if (backendConnected) {
      try {
        const simRes = await api.createSimulation('scn-ngp-001');
        const simId = simRes.id;
        const ws = connectSimulationWebSocket(simId, (msg) => {
          if (msg.type === 'SIMULATION_TIME_UPDATED') set({ clock: msg.payload.time_minutes, clockLabel: formatTime('08:00', msg.payload.time_minutes * 60) });
          else if (msg.type === 'NODE_STATE_CHANGED') {
            const nodes = { ...get().nodes };
            if (nodes[msg.payload.node_id]) { nodes[msg.payload.node_id].status = msg.payload.new_state; set({ nodes }); }
          } else if (msg.type === 'IMPACT_UPDATED') {
            const metrics = { ...get().currentMetrics };
            metrics.lifeSafetyImpactScore = msg.payload.life_safety_score;
            metrics.cascadeDepth = msg.payload.cascade_depth;
            metrics.populationAtRisk = msg.payload.population_affected;
            set({ currentMetrics: metrics });
          } else if (msg.type === 'INCIDENT_CREATED' || msg.type === 'INCIDENT_PRIORITY_CHANGED') {
            // Refresh incidents from backend would go here
          }
        });
        set({ simId, ws });
        await api.startSimulation(simId);
      } catch (err) {
        console.error("Backend failed, falling back to local mode", err);
        set({ backendConnected: false });
        get().start60sDemo();
      }
      return;
    }

    let demoSec = 0;
    const interval = setInterval(() => {
      demoSec += 1;
      get().advanceClock(1);
      if (demoSec === 55) {
        const sc = get().scenario;
        if (sc) get().selectIntervention(sc.interventions[0].id);
        get().approveIntervention();
      }
      if (demoSec >= 60) { clearInterval(interval); set({ demoTimer: null }); }
    }, 1000);

    set({ demoTimer: interval });
  },

  connectBackend: async () => {
    try {
      const res = await api.bootstrap();
      if (res.backend_connected) { set({ backendConnected: true }); console.log("Connected to LIFEGRID Backend"); }
    } catch (e) {
      console.warn("Backend unavailable, using Local Demo Mode", e);
      set({ backendConnected: false });
    }
  },

  stopDemo: () => {
    const { demoTimer } = get();
    if (demoTimer) clearInterval(demoTimer);
    set({ demoActive: false, demoTimer: null });
  },

  manualOverride: (nodeId, status) => {
    const { nodes, edges } = get();
    const newNodes = { ...nodes };
    if (!newNodes[nodeId]) return;
    newNodes[nodeId] = { ...newNodes[nodeId], status, serviceState: getServiceState(newNodes[nodeId].type, status) };

    if (status === 'FAILED') {
      edges.forEach(e => {
        if (e.source === nodeId && newNodes[e.target]) {
          newNodes[e.target] = { ...newNodes[e.target], status: 'DEGRADED', serviceState: getServiceState(newNodes[e.target].type, 'DEGRADED') };
          edges.forEach(e2 => {
            if (e2.source === e.target && newNodes[e2.target]) {
              newNodes[e2.target] = { ...newNodes[e2.target], status: 'PREDICTED_RISK', serviceState: getServiceState(newNodes[e2.target].type, 'PREDICTED_RISK') };
            }
          });
        }
      });
    } else if (status === 'OPERATIONAL') {
      edges.forEach(e => {
        if (e.source === nodeId && newNodes[e.target]) {
          newNodes[e.target] = { ...newNodes[e.target], status: 'OPERATIONAL', serviceState: getServiceState(newNodes[e.target].type, 'OPERATIONAL') };
          edges.forEach(e2 => {
            if (e2.source === e.target && newNodes[e2.target]) {
              newNodes[e2.target] = { ...newNodes[e2.target], status: 'OPERATIONAL', serviceState: getServiceState(newNodes[e2.target].type, 'OPERATIONAL') };
            }
          });
        }
      });
    }

    // Trigger incident reassessment
    const updatedIncidents: Incident[] = [];
    Object.keys(newNodes).forEach(nid => {
      if (['FAILED', 'DEGRADED', 'PREDICTED_RISK'].includes(newNodes[nid].status)) {
        const inc = assessIncident(nid, newNodes, edges);
        if (inc) updatedIncidents.push(inc);
      }
    });
    updatedIncidents.sort((a, b) => ({ P1: 0, P2: 1, P3: 2, P4: 3 }[a.priority] || 4) - ({ P1: 0, P2: 1, P3: 2, P4: 3 }[b.priority] || 4));

    // Generate responses for new incidents
    const newResponses = { ...get().coordinatedResponses };
    const newTickets = [...get().actionTickets];
    const newAdvisories = [...get().publicAdvisories];
    for (const inc of updatedIncidents) {
      if (!newResponses[inc.id]) {
        const resp = generateCoordinatedResponse(inc, newNodes);
        newResponses[inc.id] = resp;
        newTickets.push(...generateActionTickets(inc, resp));
        const adv = generatePublicAdvisory(inc, newNodes, get().clockLabel);
        if (adv) newAdvisories.push(adv);
      }
    }

    set({ nodes: newNodes, incidents: updatedIncidents, coordinatedResponses: newResponses, actionTickets: newTickets, publicAdvisories: newAdvisories });
  },

  // V2 Actions
  injectDisruption: (nodeId, disruptionType, severity) => {
    const status: NodeStatus = severity >= 80 ? 'FAILED' : severity >= 40 ? 'DEGRADED' : 'PREDICTED_RISK';
    get().manualOverride(nodeId, status);
    
    const { eventTimeline, clockLabel, nodes } = get();
    const event = {
      id: `evt-inj-${Date.now()}`,
      timestamp: clockLabel,
      type: 'SIMULATED' as const,
      entity: nodes[nodeId]?.name || nodeId,
      status: status,
      desc: `Injected disruption: ${disruptionType} (${severity}% severity)`,
      confidence: 100
    };
    
    set({ eventTimeline: [...eventTimeline, event] });
    
    // Trigger immediate cascade step so downstream nodes are updated instantly in the UI
    setTimeout(() => get().advanceClock(1), 50);
  },

  acknowledgeTicket: (ticketId) => {
    set(s => ({
      actionTickets: s.actionTickets.map(t => t.id === ticketId ? { ...t, status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString() } : t)
    }));
  },

  completeTicket: (ticketId) => {
    set(s => ({
      actionTickets: s.actionTickets.map(t => t.id === ticketId ? { ...t, status: 'COMPLETED', completedAt: new Date().toISOString(), outcome: 'Action completed' } : t)
    }));
  },

  approveAdvisory: (advisoryId) => {
    set(s => ({
      publicAdvisories: s.publicAdvisories.map(a => a.id === advisoryId ? { ...a, status: 'APPROVED' } : a)
    }));
  },

  approveCoordinatedResponse: (responseId) => {
    const { coordinatedResponses, incidents, actionTickets, nodes, eventTimeline, clockLabel } = get();
    const resp = coordinatedResponses[responseId];
    if (!resp || resp.status === 'APPROVED') return;

    const updatedResponses = { ...coordinatedResponses, [responseId]: { ...resp, status: 'APPROVED' } };
    const updatedIncidents = incidents.map(i => i.id === resp.incidentId ? { ...i, status: 'IN_PROGRESS' as any } : i);
    const updatedTickets = actionTickets.map(t => t.incidentId === resp.incidentId && t.status === 'GENERATED' ? { ...t, status: 'IN_PROGRESS' as any } : t);

    const eventsToAdd: TimelineEvent[] = [{
      id: `evt-cr-${Date.now()}`, timestamp: clockLabel, type: 'INTERVENTION',
      entity: 'COORDINATED RESPONSE', status: 'ACTIVE', desc: `Approved Plan for ${resp.incidentTitle}`, confidence: 100
    }];

    // Update target node to RECOVERING
    const newNodes = { ...nodes };
    const incident = incidents.find(i => i.id === resp.incidentId);
    if (incident && newNodes[incident.nodeId]) {
      newNodes[incident.nodeId] = { ...newNodes[incident.nodeId], status: 'RECOVERING', serviceState: getServiceState(newNodes[incident.nodeId].type, 'RECOVERING') };
      
      // Also heal downstream
      incident.downstreamEffects.forEach(nid => {
        if (newNodes[nid]) {
          newNodes[nid] = { ...newNodes[nid], status: 'RECOVERING', serviceState: getServiceState(newNodes[nid].type, 'RECOVERING') };
        }
      });
    }

    set({ coordinatedResponses: updatedResponses, incidents: updatedIncidents, actionTickets: updatedTickets, nodes: newNodes, eventTimeline: [...eventTimeline, ...eventsToAdd] });
  },
}));
