import { create } from 'zustand';
import type { InfraNode, DepEdge, Scenario, SimulationMetrics, TimelineEvent, NodeStatus, ResourceCounts } from '../types';
import { scenarios, baseVehicles } from '../data/mockScenarios';
import { api, connectSimulationWebSocket } from '../lib/api';

interface SimStore {
  /* Global State */
  scenario: Scenario | null;
  nodes: Record<string, InfraNode>;
  edges: DepEdge[];
  availableResources: ResourceCounts;
  allocatedResources: ResourceCounts;
  vehicles: typeof baseVehicles;
  
  /* Time & Progression */
  clock: number; // seconds from 0
  clockLabel: string;
  isPlaying: boolean;
  speed: number;
  
  /* Telemetry & Confidence */
  telemetryMode: 100 | 90 | 70 | 50;
  
  /* Metrics & Predictions */
  currentMetrics: SimulationMetrics;
  noActionBaseline: SimulationMetrics | null;
  predictedNode: { id: string; probability: number | string; reasoning: string[] } | null;
  
  /* Interventions & Audit */
  selectedInterventionId: string | null;
  approvedInterventionId: string | null;
  eventTimeline: TimelineEvent[];
  
  /* Demo State */
  demoActive: boolean;
  demoTimer: ReturnType<typeof setInterval> | null;

  /* Backend State */
  backendConnected: boolean;
  simId: string | null;
  ws: WebSocket | null;

  /* Actions */
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
  
  /* Backend Actions */
  connectBackend: () => Promise<void>;
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
  
  Object.values(nodes).forEach(n => {
    if (n.status === 'FAILED' || n.status === 'DEGRADED') {
      affectedServices++;
      populationExposed += n.populationServed;
      if (n.status === 'FAILED') {
        populationAtRisk += n.populationServed;
        emergencyCount++;
      }
      if (n.type === 'hospital' || n.type === 'telecom' || n.type === 'water') {
        criticalFacilitiesAffected++;
      }
    } else if (n.status === 'PREDICTED_RISK') {
      if (n.type === 'hospital' || n.type === 'telecom' || n.type === 'water') {
        criticalFacilitiesAffected++;
      }
    }
  });

  const emergencyDelayMin = affectedServices * 3;
  const resilienceScore = Math.max(0, 100 - (affectedServices * 12));
  
  // Calculate simulated life safety impact score (0-100)
  const impact = (populationAtRisk / 150000) * 40 + (criticalFacilitiesAffected * 15) + (emergencyDelayMin);
  const lifeSafetyImpactScore = Math.min(100, Math.max(0, Math.round(impact)));
  
  // Calculate risk score
  const risk = (cascadeDepth * 10) + (criticalFacilitiesAffected * 20) + (emergencyCount * 15);
  const riskScore = Math.min(100, Math.max(0, Math.round(risk)));

  return {
    populationExposed,
    populationAtRisk,
    criticalFacilitiesAffected,
    emergencyCount,
    cascadeDepth,
    emergencyDelayMin,
    resilienceScore,
    lifeSafetyImpactScore,
    riskScore
  };
};

export const useStore = create<SimStore>((set, get) => ({
  scenario: scenarios['compound-demo'],
  nodes: JSON.parse(JSON.stringify(scenarios['compound-demo'].initialNodes)),
  edges: JSON.parse(JSON.stringify(scenarios['compound-demo'].initialEdges)),
  availableResources: { ...scenarios['compound-demo'].availableResources },
  allocatedResources: { mobileGenerators: 0, trafficUnits: 0, repairCrews: 0, ambulances: 0, fireUnits: 0 },
  vehicles: [...baseVehicles],
  
  clock: 0,
  clockLabel: scenarios['compound-demo'].startTime,
  isPlaying: false,
  speed: 1,
  
  telemetryMode: 100,
  
  currentMetrics: calcMetrics(scenarios['compound-demo'].initialNodes, 0),
  noActionBaseline: null,
  predictedNode: null,
  
  selectedInterventionId: null,
  approvedInterventionId: null,
  eventTimeline: [{ 
    id: 'evt-init',
    timestamp: scenarios['compound-demo'].startTime, 
    type: 'SIMULATED', 
    entity: 'SYSTEM',
    status: 'OPERATIONAL',
    desc: `Loaded Scenario: Compound Urban Crisis` 
  }],
  
  demoActive: false,
  demoTimer: null,
  backendConnected: false,
  simId: null,
  ws: null,

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
      clock: 0,
      clockLabel: sc.startTime,
      isPlaying: false,
      telemetryMode: 100,
      currentMetrics: calcMetrics(sc.initialNodes, 0),
      noActionBaseline: null,
      predictedNode: null,
      selectedInterventionId: null,
      approvedInterventionId: null,
      eventTimeline: [{ 
        id: 'evt-init',
        timestamp: sc.startTime, 
        type: 'SIMULATED', 
        entity: 'SYSTEM',
        status: 'OPERATIONAL',
        desc: `Loaded Scenario: ${sc.name}`
      }],
      demoActive: false,
      demoTimer: null,
    });
  },

  setTelemetryMode: (mode) => {
    set({ telemetryMode: mode });
    // In a real app, this would iterate over nodes and drop their status to UNKNOWN based on Math.random() < mode/100
  },

  advanceClock: (seconds = 1) => {
    const { scenario, clock, nodes, eventTimeline } = get();
    if (!scenario) return;
    
    const nextClock = clock + seconds;
    const newNodes = { ...nodes };
    const newTimeline = [...eventTimeline];
    let newVehicles = [...get().vehicles];
    
    // Find events that happen between clock and nextClock
    const events = scenario.timedEvents.filter(e => e.t > clock && e.t <= nextClock);
    
    events.forEach((ev, i) => {
      if (ev.nodeId && newNodes[ev.nodeId]) {
        newNodes[ev.nodeId] = { ...newNodes[ev.nodeId], status: ev.newStatus || newNodes[ev.nodeId].status };
      }
      newTimeline.push({
        id: `evt-${nextClock}-${i}`,
        timestamp: formatTime(scenario.startTime, ev.t),
        type: ev.evidence === 'PREDICTED' ? 'PREDICTED' : 'OBSERVED',
        entity: ev.nodeId ? newNodes[ev.nodeId]?.name || ev.nodeId : (ev.edgeId || 'SYSTEM'),
        status: ev.newStatus || 'UNKNOWN',
        desc: ev.desc,
        confidence: ev.evidence === 'PREDICTED' ? 84 : 100
      });
    });

    // Evaluate vehicle routes
    newVehicles = newVehicles.map(v => {
      if (v.approvalStatus === 'APPROVED') return v; // Skip if already approved and rerouted

      let isBlocked = false;
      let isDegraded = false;
      let blockingNode = '';

      v.currentRoute.forEach(r => {
        // Map route string to node id (simplified mapping for the demo)
        const nodeMap: Record<string, string> = { 'R-17': 'ER-01', 'J-17': 'TJ-01', 'H-01': 'HO-01', 'D-1': 'DR-01' };
        const nodeId = nodeMap[r] || r;
        
        if (newNodes[nodeId]) {
          if (newNodes[nodeId].status === 'FAILED') {
            isBlocked = true;
            blockingNode = r;
          } else if (newNodes[nodeId].status === 'DEGRADED') {
            isDegraded = true;
          }
        }
      });

      if (isBlocked && v.routeState !== 'BLOCKED') {
        // Trigger AI Reroute Recommendation
        return {
          ...v,
          routeState: 'BLOCKED',
          interventionNeed: 'CRITICAL',
          currentETA: 20,
          rerouteReason: `${blockingNode} failed`,
          recommendedRoute: ['R-12', 'R-21', 'J-09', 'H-01'],
          projectedETA: 9,
          recommendedRouteStatus: 'SAFE',
          approvalStatus: 'PENDING'
        };
      } else if (isDegraded && !isBlocked) {
        return { ...v, routeState: 'DEGRADED', currentETA: v.normalETA + 5 };
      }
      return v;
    });

    const metrics = calcMetrics(newNodes, scenario.timedEvents.filter(e => e.t <= nextClock).length);

    // If we've reached a significant cascade depth, calculate No Action baseline by looking ahead
    let noAction = get().noActionBaseline;
    if (nextClock > 15 && !noAction) {
      // Simulate to end of scenario
      const finalNodes = JSON.parse(JSON.stringify(newNodes));
      scenario.timedEvents.filter(e => e.t > nextClock).forEach(ev => {
        if (ev.nodeId && finalNodes[ev.nodeId]) finalNodes[ev.nodeId].status = ev.newStatus || finalNodes[ev.nodeId].status;
      });
      noAction = calcMetrics(finalNodes, scenario.timedEvents.length);
    }

    // Prediction logic (mocked to appear at ~30s)
    let predicted = get().predictedNode;
    if (nextClock >= 30 && !predicted) {
      predicted = {
        id: 'HO-01',
        probability: get().telemetryMode === 100 ? 84 : '63-81',
        reasoning: [
          'J-17 traffic throughput < 30%',
          'Road R-17 blocked',
          'Alternative route degraded',
          `Traffic data confidence = ${get().telemetryMode}%`
        ]
      };
    }

    set({
      clock: nextClock,
      clockLabel: formatTime(scenario.startTime, nextClock),
      nodes: newNodes,
      vehicles: newVehicles,
      currentMetrics: metrics,
      noActionBaseline: noAction,
      predictedNode: predicted,
      eventTimeline: newTimeline
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
    const { scenario, selectedInterventionId, clockLabel, eventTimeline, allocatedResources } = get();
    if (!scenario || !selectedInterventionId) return;
    const intv = scenario.interventions.find(i => i.id === selectedInterventionId);
    if (!intv) return;

    // Allocate resources
    const newAllocated = { ...allocatedResources };
    if (intv.requiredResources.trafficUnits) newAllocated.trafficUnits += intv.requiredResources.trafficUnits;
    if (intv.requiredResources.ambulances) newAllocated.ambulances += intv.requiredResources.ambulances;
    if (intv.requiredResources.mobileGenerators) newAllocated.mobileGenerators += intv.requiredResources.mobileGenerators;
    if (intv.requiredResources.repairCrews) newAllocated.repairCrews += intv.requiredResources.repairCrews;

    const eventsToAdd = [{
      id: `evt-intv-${Date.now()}`,
      timestamp: clockLabel,
      type: 'INTERVENTION' as const,
      entity: 'LIFEGRID SYSTEM',
      status: 'ACTIVE',
      desc: `Approved Plan: ${intv.title}`,
      confidence: intv.operationalFeasibility
    }];

    const newVehicles = get().vehicles.map(v => {
      if (v.approvalStatus === 'PENDING' && v.recommendedRoute) {
        eventsToAdd.push({
          id: `evt-intv-route-${v.id}`,
          timestamp: formatTime(scenario.startTime, get().clock + 2),
          type: 'INTERVENTION' as const,
          entity: `Ambulance ${v.id}`,
          status: 'REROUTED',
          desc: `${v.id} rerouted via ${v.recommendedRoute[1]}.`,
          confidence: 100
        });
        eventsToAdd.push({
          id: `evt-intv-corr-${v.id}`,
          timestamp: formatTime(scenario.startTime, get().clock + 4),
          type: 'INTERVENTION' as const,
          entity: `Traffic Control`,
          status: 'ACTIVE',
          desc: `Emergency corridor activated for ${v.id}.`,
          confidence: 100
        });

        return {
          ...v,
          currentRoute: v.recommendedRoute,
          currentETA: v.projectedETA || v.normalETA,
          routeState: 'CLEAR',
          corridorStatus: 'ACTIVE',
          approvalStatus: 'APPROVED'
        } as any;
      }
      return v;
    });

    set({
      approvedInterventionId: selectedInterventionId,
      allocatedResources: newAllocated,
      vehicles: newVehicles,
      eventTimeline: [...eventTimeline, ...eventsToAdd]
    });

    // Schedule recovery events
    setTimeout(() => {
      get().advanceClock(10); // jump ahead to show recovery in demo
    }, 1000);
  },

  start60sDemo: async () => {
    const { backendConnected } = get();
    get().loadScenario('compound-demo');
    set({ demoActive: true });
    
    if (backendConnected) {
      // Use backend API
      try {
        const simRes = await api.createSimulation('scn-ngp-001'); // using deterministic ngp scenario if possible
        const simId = simRes.id;
        
        const ws = connectSimulationWebSocket(simId, (msg) => {
          // Handle backend updates
          if (msg.type === 'SIMULATION_TIME_UPDATED') {
            set({ clock: msg.payload.time_minutes, clockLabel: formatTime('08:00', msg.payload.time_minutes * 60) });
          } else if (msg.type === 'NODE_STATE_CHANGED') {
             const nodes = { ...get().nodes };
             if (nodes[msg.payload.node_id]) {
                nodes[msg.payload.node_id].status = msg.payload.new_state;
                set({ nodes });
             }
          } else if (msg.type === 'IMPACT_UPDATED') {
             const metrics = { ...get().currentMetrics };
             metrics.lifeSafetyImpactScore = msg.payload.life_safety_score;
             metrics.cascadeDepth = msg.payload.cascade_depth;
             metrics.populationAtRisk = msg.payload.population_affected;
             set({ currentMetrics: metrics });
          } else if (msg.type === 'INTERVENTION_UPDATED') {
             // We could load interventions dynamically here, but for demo we just show UI
          }
        });
        
        set({ simId, ws });
        await api.startSimulation(simId);
        
      } catch (err) {
        console.error("Backend failed, falling back to local mode", err);
        set({ backendConnected: false });
        get().start60sDemo(); // restart locally
      }
      return;
    }

    let demoSec = 0;
    const interval = setInterval(() => {
      demoSec += 1;
      // Advance clock by 1 second
      get().advanceClock(1);
      
      // Auto-approve intervention at 55 seconds
      if (demoSec === 55) {
        const sc = get().scenario;
        if (sc) get().selectIntervention(sc.interventions[0].id);
        get().approveIntervention();
      }

      if (demoSec >= 60) {
        clearInterval(interval);
        set({ demoTimer: null }); // Stop but keep demoActive true to show final screen
      }
    }, 1000); // 1 real second = 1 sim second for the 60s demo

    set({ demoTimer: interval });
  },

  connectBackend: async () => {
    try {
      const res = await api.bootstrap();
      if (res.backend_connected) {
        set({ backendConnected: true });
        console.log("Connected to LIFEGRID Backend");
      }
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

    newNodes[nodeId] = { ...newNodes[nodeId], status };

    // Simple reactive cascade propagation for demo purposes
    if (status === 'FAILED') {
      edges.forEach(e => {
        if (e.source === nodeId && newNodes[e.target]) {
          newNodes[e.target] = { ...newNodes[e.target], status: 'DEGRADED' };
          
          // Secondary cascade
          edges.forEach(e2 => {
            if (e2.source === e.target && newNodes[e2.target]) {
              newNodes[e2.target] = { ...newNodes[e2.target], status: 'PREDICTED_RISK' };
            }
          });
        }
      });
    } else if (status === 'OPERATIONAL') {
      // Heal downstream
      edges.forEach(e => {
        if (e.source === nodeId && newNodes[e.target]) {
          newNodes[e.target] = { ...newNodes[e.target], status: 'OPERATIONAL' };
          
          edges.forEach(e2 => {
            if (e2.source === e.target && newNodes[e2.target]) {
              newNodes[e2.target] = { ...newNodes[e2.target], status: 'OPERATIONAL' };
            }
          });
        }
      });
    }

    set({ nodes: newNodes });
  }
}));
