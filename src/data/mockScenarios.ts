import type { InfraNode, DepEdge, Scenario, ResourceCounts, EmergencyVehicle, BusRoute } from '../types';

/* ─── Global Initial Resources ─── */
const baseResources: ResourceCounts = {
  mobileGenerators: 2,
  trafficUnits: 6,
  repairCrews: 4,
  ambulances: 12,
  fireUnits: 5
};

/* ─── Base Infrastructure Nodes ─── */
const baseNodes: Record<string, InfraNode> = {
  'PS-01': { id:'PS-01', name:'Substation Central S-04', type:'power', status:'OPERATIONAL', serviceState:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:88, lat:21.1458, lng:79.0882, zone:'Central Business District', populationServed:45000, criticalityScore:98, backupAvailable:false, dataConfidence:98, dataProvenance:'LIFEGRID_SIMULATION' },
  'PS-02': { id:'PS-02', name:'Substation North S-07', type:'power', status:'OPERATIONAL', serviceState:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:62, lat:21.1550, lng:79.0780, zone:'Industrial Zone', populationServed:32000, criticalityScore:85, backupAvailable:false, dataConfidence:92, dataProvenance:'LIFEGRID_SIMULATION' },
  'HO-01': { id:'HO-01', name:'City Hospital H-01', type:'hospital', status:'OPERATIONAL', serviceState:'NORMAL', evidence:'OBSERVED', capacity:100, currentLoad:82, lat:21.1500, lng:79.0950, zone:'Medical District', populationServed:120000, criticalityScore:96, backupAvailable:true, backupType:'Generator', backupDurationMin:83, dataConfidence:81, dataProvenance:'OPENSTREETMAP' },
  'HO-02': { id:'HO-02', name:'Riverside Clinic H-02', type:'hospital', status:'OPERATIONAL', serviceState:'NORMAL', evidence:'OBSERVED', capacity:100, currentLoad:40, lat:21.1350, lng:79.0750, zone:'Riverside', populationServed:25000, criticalityScore:78, backupAvailable:true, backupType:'Generator', backupDurationMin:45, dataConfidence:85, dataProvenance:'OPENSTREETMAP' },
  'TJ-01': { id:'TJ-01', name:'Junction J-17', type:'traffic', status:'OPERATIONAL', serviceState:'NORMAL', evidence:'OBSERVED', capacity:100, currentLoad:65, lat:21.1480, lng:79.0850, zone:'Transit Corridor', populationServed:5200, criticalityScore:90, backupAvailable:true, backupType:'Battery', backupDurationMin:15, dataConfidence:94, dataProvenance:'OPENSTREETMAP' },
  'TJ-02': { id:'TJ-02', name:'Junction J-04', type:'traffic', status:'OPERATIONAL', serviceState:'NORMAL', evidence:'OBSERVED', capacity:100, currentLoad:78, lat:21.1550, lng:79.0900, zone:'Central Business District', populationServed:8000, criticalityScore:74, backupAvailable:true, backupType:'Battery', backupDurationMin:10, dataConfidence:94, dataProvenance:'OPENSTREETMAP' },
  'TC-01': { id:'TC-01', name:'Telecom Hub T-3', type:'telecom', status:'OPERATIONAL', serviceState:'CONNECTED', evidence:'OBSERVED', capacity:100, currentLoad:55, lat:21.1520, lng:79.1000, zone:'Central Business District', populationServed:95000, criticalityScore:93, backupAvailable:true, backupType:'UPS', backupDurationMin:60, dataConfidence:67, dataProvenance:'LIFEGRID_SIMULATION' },
  'TC-02': { id:'TC-02', name:'Telecom Tower T-5', type:'telecom', status:'OPERATIONAL', serviceState:'CONNECTED', evidence:'OBSERVED', capacity:100, currentLoad:40, lat:21.1380, lng:79.0920, zone:'Residential South', populationServed:48000, criticalityScore:82, backupAvailable:true, backupType:'UPS', backupDurationMin:45, dataConfidence:72, dataProvenance:'LIFEGRID_SIMULATION' },
  'DR-01': { id:'DR-01', name:'Drainage Basin D-1', type:'water', status:'OPERATIONAL', serviceState:'NORMAL', evidence:'OBSERVED', capacity:100, currentLoad:30, lat:21.1600, lng:79.1050, zone:'Riverside', populationServed:11200, criticalityScore:80, backupAvailable:false, dataConfidence:91, dataProvenance:'LIFEGRID_SIMULATION' },
  'WP-01': { id:'WP-01', name:'Water Pump Station W-02', type:'water', status:'OPERATIONAL', serviceState:'NORMAL', evidence:'OBSERVED', capacity:100, currentLoad:70, lat:21.1420, lng:79.0960, zone:'Central Utility Zone', populationServed:85000, criticalityScore:94, backupAvailable:true, backupType:'Backup Pump', backupDurationMin:120, dataConfidence:88, dataProvenance:'LIFEGRID_SIMULATION' },
  'WP-02': { id:'WP-02', name:'Water Reservoir W-05', type:'water', status:'OPERATIONAL', serviceState:'NORMAL', evidence:'OBSERVED', capacity:100, currentLoad:45, lat:21.1380, lng:79.1020, zone:'Riverside', populationServed:42000, criticalityScore:78, backupAvailable:false, dataConfidence:85, dataProvenance:'LIFEGRID_SIMULATION' },
  'ER-01': { id:'ER-01', name:'Emergency Route R-17', type:'emergency_route', status:'OPERATIONAL', serviceState:'OPEN', evidence:'OBSERVED', capacity:100, currentLoad:20, lat:21.1460, lng:79.0880, zone:'Medical District', populationServed:8400, criticalityScore:95, backupAvailable:false, dataConfidence:95, dataProvenance:'OPENSTREETMAP' },
  'EM-01': { id:'EM-01', name:'Ambulance Station A-1', type:'ambulance_station', status:'OPERATIONAL', serviceState:'AVAILABLE', evidence:'OBSERVED', capacity:100, currentLoad:10, lat:21.1300, lng:79.0800, zone:'Medical District', populationServed:0, criticalityScore:88, backupAvailable:true, backupType:'Generator', backupDurationMin:120, dataConfidence:90, dataProvenance:'OPENSTREETMAP' }
};

/* ─── Base Dependencies ─── */
const baseEdges: DepEdge[] = [
  { id:'e1', source:'PS-01', target:'TJ-01', dependencyType:'Power', strength:0.86, delayMin:5, minCapacityReq:20, fallbackAvailable:true, fallbackDurationMin:15, confidence:91, currentState:'ACTIVE' },
  { id:'e2', source:'PS-01', target:'TJ-02', dependencyType:'Power', strength:0.78, delayMin:5, minCapacityReq:20, fallbackAvailable:true, fallbackDurationMin:10, confidence:91, currentState:'ACTIVE' },
  { id:'e3', source:'PS-01', target:'TC-01', dependencyType:'Power', strength:0.95, delayMin:12, minCapacityReq:40, fallbackAvailable:true, fallbackDurationMin:60, confidence:85, currentState:'ACTIVE' },
  { id:'e4', source:'PS-01', target:'HO-01', dependencyType:'Power', strength:0.92, delayMin:0, minCapacityReq:50, fallbackAvailable:true, fallbackDurationMin:83, confidence:98, currentState:'ACTIVE' },
  { id:'e5', source:'DR-01', target:'ER-01', dependencyType:'Flood Control', strength:0.90, delayMin:10, minCapacityReq:80, fallbackAvailable:false, confidence:88, currentState:'ACTIVE' },
  { id:'e6', source:'TJ-01', target:'ER-01', dependencyType:'Traffic Flow', strength:0.85, delayMin:8, minCapacityReq:30, fallbackAvailable:true, confidence:94, currentState:'ACTIVE' },
  { id:'e7', source:'ER-01', target:'HO-01', dependencyType:'Ambulance Access', strength:0.95, delayMin:5, minCapacityReq:40, fallbackAvailable:true, confidence:90, currentState:'ACTIVE' },
  { id:'e8', source:'TC-01', target:'EM-01', dependencyType:'Dispatch Comms', strength:0.88, delayMin:2, minCapacityReq:10, fallbackAvailable:false, confidence:67, currentState:'ACTIVE' },
  { id:'e9', source:'PS-02', target:'WP-01', dependencyType:'Power', strength:0.90, delayMin:2, minCapacityReq:30, fallbackAvailable:true, fallbackDurationMin:120, confidence:88, currentState:'ACTIVE' },
  { id:'e10', source:'WP-01', target:'HO-01', dependencyType:'Water Supply', strength:0.80, delayMin:30, minCapacityReq:50, fallbackAvailable:true, fallbackDurationMin:240, confidence:85, currentState:'ACTIVE' },
  { id:'e11', source:'WP-01', target:'WP-02', dependencyType:'Water Feed', strength:0.70, delayMin:15, minCapacityReq:40, fallbackAvailable:false, confidence:80, currentState:'ACTIVE' },
  { id:'e12', source:'TC-01', target:'TC-02', dependencyType:'Network Link', strength:0.65, delayMin:5, minCapacityReq:20, fallbackAvailable:true, fallbackDurationMin:30, confidence:72, currentState:'ACTIVE' },
];

/* ─── Base Emergency Vehicles ─── */
export const baseVehicles: EmergencyVehicle[] = [
  { id: 'A-102', type: 'AMBULANCE', priority: 'P1', targetNodeId: 'HO-01', currentDelayMin: 0, routeState: 'CLEAR', interventionNeed: 'LOW', currentRoute: ['R-12', 'R-17', 'J-17', 'H-01'], normalETA: 8, currentETA: 8, corridorStatus: 'NOT_ACTIVE', approvalStatus: 'NOT_REQUIRED' },
  { id: 'A-207', type: 'AMBULANCE', priority: 'P1', targetNodeId: 'HO-01', currentDelayMin: 0, routeState: 'CLEAR', interventionNeed: 'LOW', currentRoute: ['R-05', 'R-08', 'J-11', 'H-01'], normalETA: 11, currentETA: 11, corridorStatus: 'NOT_ACTIVE', approvalStatus: 'NOT_REQUIRED' },
  { id: 'F-311', type: 'FIRE', priority: 'P2', targetNodeId: 'TJ-01', currentDelayMin: 0, routeState: 'CLEAR', interventionNeed: 'LOW', currentRoute: ['R-02', 'R-04', 'J-04'], normalETA: 5, currentETA: 5, corridorStatus: 'NOT_ACTIVE', approvalStatus: 'NOT_REQUIRED' },
];

/* ─── Bus Routes ─── */
export const baseBusRoutes: BusRoute[] = [
  { id: 'BR-01', name: 'CBD Express', routeNumber: '101', roadSegments: ['ER-01', 'TJ-01'], status: 'NORMAL', delayMinutes: 0 },
  { id: 'BR-02', name: 'Riverside Link', routeNumber: '203', roadSegments: ['DR-01', 'WP-02'], status: 'NORMAL', delayMinutes: 0 },
  { id: 'BR-03', name: 'Medical District Shuttle', routeNumber: '305', roadSegments: ['ER-01', 'HO-01'], status: 'NORMAL', delayMinutes: 0 },
  { id: 'BR-04', name: 'Industrial Connector', routeNumber: '410', roadSegments: ['PS-02', 'TJ-02'], status: 'NORMAL', delayMinutes: 0 },
  { id: 'BR-05', name: 'South Circular', routeNumber: '512', roadSegments: ['TC-02', 'WP-02', 'HO-02'], status: 'NORMAL', delayMinutes: 0 },
  { id: 'BR-06', name: 'North Express', routeNumber: '607', roadSegments: ['PS-02', 'TJ-01', 'TC-01'], status: 'NORMAL', delayMinutes: 0 },
];

/* ─── Agency Resources ─── */
export const baseAgencyResources = [
  { id: 'AR-01', agencyCategory: 'Traffic Control', resourceType: 'Traffic Control Teams', total: 6, available: 6, deployed: 0, unit: 'teams' },
  { id: 'AR-02', agencyCategory: 'Municipal Road/Drainage', resourceType: 'Drainage/Pump Teams', total: 3, available: 3, deployed: 0, unit: 'teams' },
  { id: 'AR-03', agencyCategory: 'Water Utility', resourceType: 'Water Repair Crews', total: 4, available: 4, deployed: 0, unit: 'crews' },
  { id: 'AR-04', agencyCategory: 'Power Utility', resourceType: 'Mobile Generators', total: 2, available: 2, deployed: 0, unit: 'units' },
  { id: 'AR-05', agencyCategory: 'Power Utility', resourceType: 'Electrical Repair Crews', total: 3, available: 3, deployed: 0, unit: 'crews' },
  { id: 'AR-06', agencyCategory: 'EMS / Fire Service', resourceType: 'Ambulances', total: 12, available: 12, deployed: 0, unit: 'vehicles' },
  { id: 'AR-07', agencyCategory: 'EMS / Fire Service', resourceType: 'Fire Units', total: 5, available: 5, deployed: 0, unit: 'units' },
  { id: 'AR-08', agencyCategory: 'Water Utility', resourceType: 'Water Tankers', total: 4, available: 4, deployed: 0, unit: 'vehicles' },
  { id: 'AR-09', agencyCategory: 'Telecom Operations', resourceType: 'Telecom Repair Crews', total: 2, available: 2, deployed: 0, unit: 'crews' },
];

/* ─── Water Nodes ─── */
export const baseWaterNodes = [
  { id: 'WN-01', infrastructureNodeId: 'WP-01', pumpStatus: 'OPERATIONAL', pressure: 100, flow: 100, storageReserveLiters: 50000, alternateSourceAvailable: true, hospitalDependency: ['HO-01'], fireDependency: ['EM-01'] },
  { id: 'WN-02', infrastructureNodeId: 'WP-02', pumpStatus: 'OPERATIONAL', pressure: 85, flow: 90, storageReserveLiters: 30000, alternateSourceAvailable: false, hospitalDependency: ['HO-02'], fireDependency: [] },
  { id: 'WN-03', infrastructureNodeId: 'DR-01', pumpStatus: 'OPERATIONAL', pressure: 100, flow: 100, storageReserveLiters: 0, alternateSourceAvailable: false, hospitalDependency: [], fireDependency: [] },
];

/* ─── Tanker Resources ─── */
export const baseTankers = [
  { id: 'TK-01', capacityLiters: 12000, currentLocation: 'Central Depot', availability: 'AVAILABLE', travelTimeMinutes: 15 },
  { id: 'TK-02', capacityLiters: 10000, currentLocation: 'South Depot', availability: 'AVAILABLE', travelTimeMinutes: 20 },
  { id: 'TK-03', capacityLiters: 8000, currentLocation: 'North Depot', availability: 'AVAILABLE', travelTimeMinutes: 25 },
  { id: 'TK-04', capacityLiters: 15000, currentLocation: 'Industrial Zone', availability: 'AVAILABLE', travelTimeMinutes: 30 },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                              SCENARIOS                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const scenarios: Record<string, Scenario> = {
  
  'compound-demo': {
    scenarioId: 'compound-demo',
    version: '2.0',
    name: 'Compound Urban Crisis (60s Demo)',
    desc: 'Rainfall → Road Flood → Power Stress → Telecom Degradation → Water Pressure Drop. Full 10-step LIFEGRID pipeline demonstration.',
    startTime: '10:00:00',
    initialNodes: JSON.parse(JSON.stringify(baseNodes)),
    initialEdges: JSON.parse(JSON.stringify(baseEdges)),
    availableResources: { ...baseResources },
    
    timedEvents: [
      { t: 3,  type: 'DEGRADATION', nodeId: 'DR-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Extreme rainfall begins. Drainage capacity rising.', cause: 'Weather event' },
      { t: 8,  type: 'FAILURE', nodeId: 'DR-01', newStatus: 'FAILED', evidence: 'OBSERVED', desc: 'Drainage Basin D-1 capacity exceeded.', cause: 'Sustained extreme rainfall' },
      { t: 12, type: 'FAILURE', nodeId: 'ER-01', newStatus: 'FAILED', evidence: 'OBSERVED', desc: 'Road R-17 floods. Emergency route BLOCKED.', cause: 'Drainage overflow' },
      { t: 17, type: 'DEGRADATION', nodeId: 'PS-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Substation S-04 load spike from pump activation.', cause: 'Emergency pump demand' },
      { t: 22, type: 'DEGRADATION', nodeId: 'TJ-01', newStatus: 'DEGRADED', evidence: 'PREDICTED', desc: 'Junction J-17 entering congestion from rerouting.', cause: 'R-17 traffic redistribution' },
      { t: 26, type: 'DEGRADATION', nodeId: 'TC-01', newStatus: 'DEGRADED', evidence: 'PREDICTED', desc: 'Telecom Hub T-3 degraded — increased load.', cause: 'Power instability + network surge' },
      { t: 30, type: 'DEGRADATION', nodeId: 'WP-01', newStatus: 'DEGRADED', evidence: 'INFERRED', desc: 'Water Pump W-02 pressure dropping.', cause: 'Power degradation affecting pump efficiency' },
      { t: 34, type: 'DEGRADATION', nodeId: 'EM-01', newStatus: 'DEGRADED', evidence: 'INFERRED', desc: 'Ambulance dispatch degraded. P1 delay rising.', cause: 'Telecom + route degradation' },
      { t: 38, type: 'DEGRADATION', nodeId: 'HO-01', newStatus: 'PREDICTED_RISK', evidence: 'PREDICTED', desc: 'Hospital H-01 accessibility becoming critical.', cause: 'Multi-cascade convergence on Medical District' },
    ],

    interventions: [
      { 
        id: 'int-coord', title: 'Coordinated Multi-Agency Response', 
        desc: 'INFRASTRUCTURE: Deploy drainage pumps + reroute traffic\nAGENCY: Traffic Control + Water Utility + Power Utility\nEMERGENCY: Reroute ambulances via safe corridors\nPUBLIC: Issue road closure + water conservation advisory\nVERIFICATION: Monitor road throughput + water pressure + emergency ETA',
        requiredResources: { trafficUnits: 3, repairCrews: 2 },
        expectedSetupMin: 10,
        operationalFeasibility: 88,
        resourceCost: 'MEDIUM',
        expectedImpactReductionPct: 72,
        cascadeReduction: 4,
        recoveryImprovementMin: 60,
        emergencyAccessibilityImprovementPct: 45,
        potentialSideEffects: ['Normal traffic delayed by +8%', 'Water rationing may affect commercial areas'],
        assumptions: ['Drainage pumps can arrive within 15 min', 'Alternate emergency routes have capacity'],
        priority: 1
      },
      { 
        id: 'int-ems', title: 'Emergency-First Response', 
        desc: 'EMERGENCY: Reroute all ambulances via R-21 corridor\nAGENCY: Traffic Control deploys at J-09\nPUBLIC: Expect delays near Medical District\nVERIFICATION: Monitor ambulance ETA',
        requiredResources: { trafficUnits: 2, ambulances: 2 },
        expectedSetupMin: 4,
        operationalFeasibility: 94,
        resourceCost: 'LOW',
        expectedImpactReductionPct: 40,
        cascadeReduction: 1,
        recoveryImprovementMin: 15,
        emergencyAccessibilityImprovementPct: 35,
        potentialSideEffects: ['Does not address water/power degradation', 'Cascade continues'],
        assumptions: ['R-21 corridor is clear'],
        priority: 2
      },
      { 
        id: 'int-pump', title: 'Full Infrastructure Recovery', 
        desc: 'Deploy heavy pumps + generator + full traffic rerouting.\nLong setup but addresses root cause.',
        requiredResources: { repairCrews: 3, trafficUnits: 4, mobileGenerators: 1 },
        expectedSetupMin: 45,
        operationalFeasibility: 42,
        resourceCost: 'HIGH',
        expectedImpactReductionPct: 90,
        cascadeReduction: 5,
        recoveryImprovementMin: 90,
        emergencyAccessibilityImprovementPct: 50,
        potentialSideEffects: ['Long setup renders it useless for immediate emergencies', 'Drains city-wide resources'],
        assumptions: ['Pumps and generator arrive before flooding peaks'],
        priority: 3
      }
    ],

    compoundRules: [
      {
        conditions: [{ type: 'water', status: 'DEGRADED' }, { type: 'power', status: 'DEGRADED' }],
        effect: { targetType: 'traffic', capacityMultiplier: 0.42, description: 'Combined power+water stress reduces traffic throughput by 58%' }
      },
      {
        conditions: [{ type: 'telecom', status: 'DEGRADED' }, { type: 'emergency_route', status: 'FAILED' }],
        effect: { targetType: 'ambulance_station', capacityMultiplier: 0.50, description: 'Comms degradation + blocked route severely impacts EMS dispatch' }
      }
    ]
  },

  'power-outage': {
    scenarioId: 'power-outage',
    version: '2.0',
    name: 'Peak-Hour Power Outage',
    desc: 'Substation S-04 experiences critical failure during peak load, cascading across traffic, telecom, hospital, and emergency services.',
    startTime: '14:30:00',
    initialNodes: JSON.parse(JSON.stringify(baseNodes)),
    initialEdges: JSON.parse(JSON.stringify(baseEdges)),
    availableResources: { ...baseResources },
    timedEvents: [
      { t: 0,  type: 'FAILURE', nodeId: 'PS-01', newStatus: 'FAILED', evidence: 'OBSERVED', desc: 'Substation S-04 offline.', cause: 'Transformer overload' },
      { t: 5,  type: 'DEGRADATION', nodeId: 'TJ-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Junction J-17 on battery backup.', cause: 'Power loss' },
      { t: 10, type: 'DEGRADATION', nodeId: 'TJ-02', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Junction J-04 on battery backup.', cause: 'Power loss' },
      { t: 15, type: 'DEGRADATION', nodeId: 'TC-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Telecom Hub T-3 on UPS.', cause: 'Power loss' },
      { t: 20, type: 'DEGRADATION', nodeId: 'ER-01', newStatus: 'DEGRADED', evidence: 'PREDICTED', desc: 'Emergency Route congested.', cause: 'Signal timing lost' },
      { t: 27, type: 'DEGRADATION', nodeId: 'HO-01', newStatus: 'PREDICTED_RISK', evidence: 'PREDICTED', desc: 'Hospital accessibility at risk.', cause: 'Ambulance delays' },
    ],
    interventions: [
      { id: 'int-gen', title: 'Deploy Mobile Generator + Traffic Control', desc: 'Dispatch generator to S-04, deploy traffic officers.', requiredResources: { mobileGenerators: 1, trafficUnits: 4 }, expectedSetupMin: 12, operationalFeasibility: 91, resourceCost: 'MEDIUM', expectedImpactReductionPct: 72, cascadeReduction: 3, recoveryImprovementMin: 44, emergencyAccessibilityImprovementPct: 55, potentialSideEffects: ['Depletes 66% of traffic units'], assumptions: ['Generator can power critical circuits'], priority: 1 },
      { id: 'int-reroute', title: 'Emergency Rerouting Only', desc: 'Reroute vehicles via alternate corridors.', requiredResources: { trafficUnits: 2 }, expectedSetupMin: 5, operationalFeasibility: 98, resourceCost: 'LOW', expectedImpactReductionPct: 25, cascadeReduction: 0, recoveryImprovementMin: 5, emergencyAccessibilityImprovementPct: 20, potentialSideEffects: ['Root cause unaddressed'], assumptions: ['Alternate routes have capacity'], priority: 2 }
    ]
  },

  'traffic-failure': {
    scenarioId: 'traffic-failure',
    version: '1.0',
    name: 'Traffic Junction Signal Failure',
    desc: 'Critical junction J-17 signal controller fails, causing gridlock that cascades into emergency route blockage.',
    startTime: '08:30:00',
    initialNodes: JSON.parse(JSON.stringify(baseNodes)),
    initialEdges: JSON.parse(JSON.stringify(baseEdges)),
    availableResources: { ...baseResources },
    timedEvents: [
      { t: 0,  type: 'FAILURE', nodeId: 'TJ-01', newStatus: 'FAILED', evidence: 'OBSERVED', desc: 'Junction J-17 signal controller fails.', cause: 'Hardware fault' },
      { t: 8,  type: 'DEGRADATION', nodeId: 'ER-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Emergency Route R-17 congestion rising.', cause: 'J-17 gridlock spillover' },
      { t: 15, type: 'DEGRADATION', nodeId: 'TJ-02', newStatus: 'DEGRADED', evidence: 'PREDICTED', desc: 'Junction J-04 absorbing diverted traffic.', cause: 'Traffic redistribution' },
      { t: 22, type: 'DEGRADATION', nodeId: 'EM-01', newStatus: 'DEGRADED', evidence: 'INFERRED', desc: 'Ambulance response times increasing.', cause: 'Route congestion' },
    ],
    interventions: [
      { id: 'int-traffic', title: 'Manual Traffic Control + Signal Override', desc: 'Deploy officers to J-17 for manual control, implement J-04 timing adjustments.', requiredResources: { trafficUnits: 3 }, expectedSetupMin: 8, operationalFeasibility: 92, resourceCost: 'LOW', expectedImpactReductionPct: 60, cascadeReduction: 2, recoveryImprovementMin: 30, emergencyAccessibilityImprovementPct: 40, potentialSideEffects: ['Nearby junctions may see +5% delays'], assumptions: ['Officers arrive within 8 min'], priority: 1 },
    ]
  },

  'hospital-degradation': {
    scenarioId: 'hospital-degradation',
    version: '1.0',
    name: 'Hospital Generator Failure',
    desc: 'City Hospital H-01 backup generator fails during a power fluctuation, threatening critical services.',
    startTime: '22:00:00',
    initialNodes: JSON.parse(JSON.stringify(baseNodes)),
    initialEdges: JSON.parse(JSON.stringify(baseEdges)),
    availableResources: { ...baseResources },
    timedEvents: [
      { t: 0,  type: 'DEGRADATION', nodeId: 'PS-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Power fluctuation at Substation S-04.', cause: 'Grid instability' },
      { t: 5,  type: 'DEGRADATION', nodeId: 'HO-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Hospital H-01 switches to generator — generator fails.', cause: 'Generator mechanical failure' },
      { t: 12, type: 'FAILURE', nodeId: 'HO-01', newStatus: 'FAILED', evidence: 'OBSERVED', desc: 'Hospital H-01 on emergency battery only. Critical systems at risk.', cause: 'Generator + power failure' },
      { t: 18, type: 'DEGRADATION', nodeId: 'EM-01', newStatus: 'DEGRADED', evidence: 'INFERRED', desc: 'Ambulances diverted from H-01 to alternate hospitals.', cause: 'Hospital capacity critical' },
    ],
    interventions: [
      { id: 'int-hosp', title: 'Emergency Generator Deployment + Patient Redistribution', desc: 'Deploy mobile generator to H-01, redistribute stable patients, notify alternate hospitals.', requiredResources: { mobileGenerators: 1, ambulances: 3 }, expectedSetupMin: 15, operationalFeasibility: 85, resourceCost: 'HIGH', expectedImpactReductionPct: 75, cascadeReduction: 2, recoveryImprovementMin: 60, emergencyAccessibilityImprovementPct: 30, potentialSideEffects: ['Ambulance availability reduced for new calls'], assumptions: ['Mobile generator compatible with H-01 systems'], priority: 1 },
    ]
  },

  'telecom-failure': {
    scenarioId: 'telecom-failure',
    version: '1.0',
    name: 'Telecom Hub Outage',
    desc: 'Telecom Hub T-3 experiences partial outage, degrading data confidence across the network and affecting EMS dispatch.',
    startTime: '16:00:00',
    initialNodes: JSON.parse(JSON.stringify(baseNodes)),
    initialEdges: JSON.parse(JSON.stringify(baseEdges)),
    availableResources: { ...baseResources },
    timedEvents: [
      { t: 0,  type: 'FAILURE', nodeId: 'TC-01', newStatus: 'FAILED', evidence: 'OBSERVED', desc: 'Telecom Hub T-3 partial outage.', cause: 'Equipment failure' },
      { t: 6,  type: 'DEGRADATION', nodeId: 'TC-02', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Tower T-5 overloaded from rerouted traffic.', cause: 'Network redistribution' },
      { t: 12, type: 'DEGRADATION', nodeId: 'EM-01', newStatus: 'DEGRADED', evidence: 'INFERRED', desc: 'EMS dispatch reliability degraded.', cause: 'Communication gaps' },
      { t: 20, type: 'DEGRADATION', nodeId: 'HO-01', newStatus: 'PREDICTED_RISK', evidence: 'PREDICTED', desc: 'Hospital telemetry confidence dropping.', cause: 'Telecom cascade' },
    ],
    interventions: [
      { id: 'int-tele', title: 'Deploy Mobile Comm Unit + Radio Backup', desc: 'Deploy mobile communication unit, activate radio-based EMS dispatch.', requiredResources: { repairCrews: 1 }, expectedSetupMin: 15, operationalFeasibility: 80, resourceCost: 'MEDIUM', expectedImpactReductionPct: 55, cascadeReduction: 2, recoveryImprovementMin: 40, emergencyAccessibilityImprovementPct: 25, potentialSideEffects: ['Radio dispatch less efficient than digital'], assumptions: ['Mobile comm unit available'], priority: 1 },
    ]
  },

  'water-failure': {
    scenarioId: 'water-failure',
    version: '1.0',
    name: 'Water Pump Station Failure',
    desc: 'Water Pump Station W-02 fails, threatening hospital water reserves, fire hydrant availability, and residential supply.',
    startTime: '11:00:00',
    initialNodes: JSON.parse(JSON.stringify(baseNodes)),
    initialEdges: JSON.parse(JSON.stringify(baseEdges)),
    availableResources: { ...baseResources },
    timedEvents: [
      { t: 0,  type: 'FAILURE', nodeId: 'WP-01', newStatus: 'FAILED', evidence: 'OBSERVED', desc: 'Water Pump W-02 fails. Pressure dropping.', cause: 'Pump mechanical failure' },
      { t: 8,  type: 'DEGRADATION', nodeId: 'WP-02', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Reservoir W-05 feed pressure dropping.', cause: 'Upstream pump failure' },
      { t: 15, type: 'DEGRADATION', nodeId: 'HO-01', newStatus: 'PREDICTED_RISK', evidence: 'PREDICTED', desc: 'Hospital H-01 water reserve at risk.', cause: 'Water supply disruption' },
    ],
    interventions: [
      { id: 'int-water', title: 'Switch Supply + Tanker Deployment + Hospital Protection', desc: 'INFRASTRUCTURE: Switch to alternate supply, deploy tankers\nAGENCY: Water Utility leads, Fire service secures hydrants\nEMERGENCY: Protect hospital reserves\nPUBLIC: Water conservation advisory\nVERIFICATION: Monitor pressure + hospital reserve level', requiredResources: { repairCrews: 2 }, expectedSetupMin: 15, operationalFeasibility: 82, resourceCost: 'MEDIUM', expectedImpactReductionPct: 65, cascadeReduction: 2, recoveryImprovementMin: 120, emergencyAccessibilityImprovementPct: 15, potentialSideEffects: ['Residential water rationing for 2-4 hours'], assumptions: ['Alternate supply has sufficient capacity', 'Tankers available within 20 min'], priority: 1 },
    ]
  },

  'urban-flood': {
    scenarioId: 'urban-flood',
    version: '1.0',
    name: 'Urban Road Flooding',
    desc: 'Road R-17 floods during monsoon, blocking emergency routes and cascading into traffic, hospital access, and public transport.',
    startTime: '09:00:00',
    initialNodes: JSON.parse(JSON.stringify(baseNodes)),
    initialEdges: JSON.parse(JSON.stringify(baseEdges)),
    availableResources: { ...baseResources },
    timedEvents: [
      { t: 0,  type: 'FAILURE', nodeId: 'ER-01', newStatus: 'FAILED', evidence: 'OBSERVED', desc: 'Road R-17 flooding. Route BLOCKED.', cause: 'Monsoon flooding' },
      { t: 5,  type: 'DEGRADATION', nodeId: 'TJ-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Junction J-17 congested from rerouting.', cause: 'Traffic redistribution' },
      { t: 12, type: 'DEGRADATION', nodeId: 'EM-01', newStatus: 'DEGRADED', evidence: 'INFERRED', desc: 'Ambulance routes disrupted.', cause: 'Route blockage' },
      { t: 18, type: 'DEGRADATION', nodeId: 'HO-01', newStatus: 'PREDICTED_RISK', evidence: 'PREDICTED', desc: 'Hospital accessibility degrading.', cause: 'Multiple route congestion' },
    ],
    interventions: [
      { id: 'int-flood', title: 'Drainage Deployment + Distributed Rerouting', desc: 'Deploy pumps to R-17, distribute traffic across 4 alternate corridors, activate emergency route via R-21.', requiredResources: { trafficUnits: 3, repairCrews: 2 }, expectedSetupMin: 20, operationalFeasibility: 78, resourceCost: 'MEDIUM', expectedImpactReductionPct: 68, cascadeReduction: 3, recoveryImprovementMin: 60, emergencyAccessibilityImprovementPct: 45, potentialSideEffects: ['Alternate routes see +10% delay', 'Bus routes 101, 305 temporarily diverted'], assumptions: ['Pumps can lower water level within 45 min'], priority: 1 },
    ]
  },

  'emergency-shortage': {
    scenarioId: 'emergency-shortage',
    version: '1.0',
    name: 'Multi-Ambulance Conflict',
    desc: 'Two simultaneous P1 calls compete for limited ambulance resources while traffic degradation affects response times.',
    startTime: '19:00:00',
    initialNodes: JSON.parse(JSON.stringify(baseNodes)),
    initialEdges: JSON.parse(JSON.stringify(baseEdges)),
    availableResources: { ...baseResources },
    timedEvents: [
      { t: 0,  type: 'DEGRADATION', nodeId: 'TJ-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Junction J-17 peak-hour congestion.', cause: 'Evening rush hour' },
      { t: 5,  type: 'DEGRADATION', nodeId: 'ER-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Emergency Route R-17 slow.', cause: 'Traffic spillover' },
      { t: 10, type: 'DEGRADATION', nodeId: 'EM-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Multiple P1 calls — resource conflict.', cause: 'Simultaneous emergencies' },
      { t: 15, type: 'DEGRADATION', nodeId: 'HO-01', newStatus: 'PREDICTED_RISK', evidence: 'PREDICTED', desc: 'Hospital intake capacity under pressure.', cause: 'Multiple incoming patients' },
    ],
    interventions: [
      { id: 'int-ems', title: 'EMS Coordination + Traffic Priority', desc: 'Coordinate ambulance dispatch: A-102 to H-01, A-207 to H-02. Deploy traffic officers for green corridors.', requiredResources: { trafficUnits: 2, ambulances: 2 }, expectedSetupMin: 5, operationalFeasibility: 90, resourceCost: 'LOW', expectedImpactReductionPct: 55, cascadeReduction: 1, recoveryImprovementMin: 20, emergencyAccessibilityImprovementPct: 40, potentialSideEffects: ['H-02 receives patient outside primary coverage'], assumptions: ['H-02 has available capacity', 'Traffic officers available immediately'], priority: 1 },
    ]
  },
};
