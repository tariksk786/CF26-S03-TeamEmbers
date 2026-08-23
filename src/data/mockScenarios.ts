import type { InfraNode, DepEdge, Scenario, ResourceCounts, EmergencyVehicle } from '../types';

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
  'PS-01': { id:'PS-01', name:'Substation Central S-04', type:'power', status:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:88, lat:21.1458, lng:79.0882, zone:'Central Business District', populationServed:45000, criticalityScore:98, backupAvailable:false, dataConfidence:98 },
  'HO-01': { id:'HO-01', name:'City Hospital H-01', type:'hospital', status:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:82, lat:21.1500, lng:79.0950, zone:'Medical District', populationServed:120000, criticalityScore:96, backupAvailable:true, backupType:'Generator', backupDurationMin:83, dataConfidence:81 },
  'HO-02': { id:'HO-02', name:'Riverside Clinic H-02', type:'hospital', status:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:40, lat:21.1350, lng:79.0750, zone:'Riverside', populationServed:25000, criticalityScore:78, backupAvailable:true, backupType:'Generator', backupDurationMin:45, dataConfidence:85 },
  'TJ-01': { id:'TJ-01', name:'Junction J-17', type:'traffic', status:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:65, lat:21.1480, lng:79.0850, zone:'Transit Corridor', populationServed:5200, criticalityScore:90, backupAvailable:true, backupType:'Battery', backupDurationMin:15, dataConfidence:94 },
  'TJ-02': { id:'TJ-02', name:'Junction J-04', type:'traffic', status:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:78, lat:21.1550, lng:79.0900, zone:'Central Business District', populationServed:8000, criticalityScore:74, backupAvailable:true, backupType:'Battery', backupDurationMin:10, dataConfidence:94 },
  'TC-01': { id:'TC-01', name:'Telecom Hub T-3', type:'telecom', status:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:55, lat:21.1520, lng:79.1000, zone:'Central Business District', populationServed:95000, criticalityScore:93, backupAvailable:true, backupType:'UPS', backupDurationMin:60, dataConfidence:67 },
  'DR-01': { id:'DR-01', name:'Drainage Basin D-1', type:'water', status:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:30, lat:21.1600, lng:79.1050, zone:'Riverside', populationServed:11200, criticalityScore:80, backupAvailable:false, dataConfidence:91 },
  'ER-01': { id:'ER-01', name:'Emergency Route R-17', type:'emergency_route', status:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:20, lat:21.1460, lng:79.0880, zone:'Medical District', populationServed:8400, criticalityScore:95, backupAvailable:false, dataConfidence:95 },
  'EM-01': { id:'EM-01', name:'Ambulance Station A-1', type:'ambulance_station', status:'OPERATIONAL', evidence:'OBSERVED', capacity:100, currentLoad:10, lat:21.1300, lng:79.0800, zone:'Medical District', populationServed:0, criticalityScore:88, backupAvailable:true, backupType:'Generator', backupDurationMin:120, dataConfidence:90 }
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
];

/* ─── Base Emergency Vehicles ─── */
export const baseVehicles: EmergencyVehicle[] = [
  { id: 'A-102', type: 'AMBULANCE', priority: 'P1', targetNodeId: 'HO-01', currentDelayMin: 0, routeState: 'CLEAR', interventionNeed: 'LOW', currentRoute: ['R-12', 'R-17', 'J-17', 'H-01'], normalETA: 8, currentETA: 8, corridorStatus: 'NOT_ACTIVE', approvalStatus: 'NOT_REQUIRED' },
  { id: 'A-207', type: 'AMBULANCE', priority: 'P1', targetNodeId: 'HO-01', currentDelayMin: 0, routeState: 'CLEAR', interventionNeed: 'LOW', currentRoute: ['R-05', 'R-08', 'J-11', 'H-01'], normalETA: 11, currentETA: 11, corridorStatus: 'NOT_ACTIVE', approvalStatus: 'NOT_REQUIRED' },
  { id: 'F-311', type: 'FIRE', priority: 'P2', targetNodeId: 'TJ-01', currentDelayMin: 0, routeState: 'CLEAR', interventionNeed: 'LOW', currentRoute: ['R-02', 'R-04', 'J-04'], normalETA: 5, currentETA: 5, corridorStatus: 'NOT_ACTIVE', approvalStatus: 'NOT_REQUIRED' },
];

/* ─── Scenarios ─── */
export const scenarios: Record<string, Scenario> = {
  
  'compound-demo': {
    scenarioId: 'compound-demo',
    version: '1.0',
    name: 'Compound Urban Crisis (60s Demo)',
    desc: 'Automated deterministic script: Rainfall exceeds drainage, floods roads, disrupts traffic, and degrades medical district accessibility.',
    startTime: '10:00:00',
    initialNodes: JSON.parse(JSON.stringify(baseNodes)),
    initialEdges: JSON.parse(JSON.stringify(baseEdges)),
    availableResources: { ...baseResources },
    
    // The exact 60s hackathon demo script requested
    timedEvents: [
      { t: 5, type: 'DEGRADATION', nodeId: 'DR-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Extreme rainfall begins.', cause: 'Weather event' },
      { t: 10, type: 'CAPACITY_DROP', nodeId: 'DR-01', evidence: 'OBSERVED', desc: 'Drainage capacity exceeded.', cause: 'Sustained rainfall' },
      { t: 15, type: 'FAILURE', nodeId: 'ER-01', newStatus: 'FAILED', evidence: 'OBSERVED', desc: 'Road R-17 floods.', cause: 'Drainage DR-01 capacity exceeded' },
      { t: 20, type: 'DEGRADATION', nodeId: 'TJ-01', newStatus: 'DEGRADED', evidence: 'PREDICTED', desc: 'Traffic congestion spreads.', cause: 'Rerouting from R-17' },
      { t: 25, type: 'DEGRADATION', edgeId: 'e7', newStatus: 'DEGRADED', evidence: 'PREDICTED', desc: 'Two emergency routes become degraded.', cause: 'Junction J-17 gridlock' },
      { t: 30, type: 'DEGRADATION', nodeId: 'EM-01', newStatus: 'DEGRADED', evidence: 'INFERRED', desc: 'P1 ambulance delay rises.', cause: 'Emergency route degradation' },
      { t: 35, type: 'DEGRADATION', nodeId: 'HO-01', newStatus: 'PREDICTED_RISK', evidence: 'PREDICTED', desc: 'Hospital H-01 accessibility becomes critical.', cause: 'Cascade congestion reaching Medical District' },
    ],

    interventions: [
      { 
        id: 'int-coord', title: 'Coordinate Ambulance A + B', 
        desc: 'Ambulance A-102\nCurrent Route: R-12 → R-17 → J-17 → H-01 (🔴 BLOCKED)\nRecommended: R-12 → R-21 → J-09 → H-01 (🟢 SAFE)\nProjected ETA: 20 min → 9 min\n\nAction:\n• Reroute A-102\n• Activate temporary emergency corridor\n• Notify Traffic Unit T-02\n• Prioritize J-09',
        requiredResources: { trafficUnits: 2, ambulances: 2 },
        expectedSetupMin: 4,
        operationalFeasibility: 94,
        resourceCost: 'LOW',
        expectedImpactReductionPct: 66,
        cascadeReduction: 3,
        recoveryImprovementMin: 44,
        emergencyAccessibilityImprovementPct: 33,
        potentialSideEffects: ['Normal traffic delayed by +4%'],
        assumptions: ['Vehicles A and B can share Route 21'],
        priority: 1
      },
      { 
        id: 'int-p1', title: 'Prioritize Ambulance A Only (Green Corridor)', 
        desc: 'Force all traffic lights green for Ambulance A-102.',
        requiredResources: { trafficUnits: 1 },
        expectedSetupMin: 2,
        operationalFeasibility: 98,
        resourceCost: 'LOW',
        expectedImpactReductionPct: 30,
        cascadeReduction: 1,
        recoveryImprovementMin: 10,
        emergencyAccessibilityImprovementPct: 15,
        potentialSideEffects: ['Ambulance B delayed by +3 min', 'Normal traffic delayed by +12%', 'Secondary risk of junction lockup'],
        assumptions: ['Ambulance A patient is solely critical'],
        priority: 2
      },
      { 
        id: 'int-pump', title: 'Deploy Mobile Pumps & Reroute', 
        desc: 'Deploy heavy pumps to DR-01 and reroute all traffic.',
        requiredResources: { repairCrews: 3, trafficUnits: 4 },
        expectedSetupMin: 45,
        operationalFeasibility: 42,
        resourceCost: 'HIGH',
        expectedImpactReductionPct: 85,
        cascadeReduction: 4,
        recoveryImprovementMin: 90,
        emergencyAccessibilityImprovementPct: 40,
        potentialSideEffects: ['High setup time renders it useless for immediate medical emergencies', 'Drains city-wide repair crew availability'],
        assumptions: ['Pumps can arrive before flooding peaks'],
        priority: 3
      }
    ],

    compoundRules: [
      {
        conditions: [
          { type: 'water', status: 'DEGRADED' },
          { type: 'power', status: 'FAILED' }
        ],
        effect: { targetType: 'traffic', capacityMultiplier: 0.42, description: 'Traffic throughput -58%' }
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
      { t: 0, type: 'FAILURE', nodeId: 'PS-01', newStatus: 'FAILED', evidence: 'OBSERVED', desc: 'Substation S-04 offline.', cause: 'Transformer overload' },
      { t: 5, type: 'DEGRADATION', nodeId: 'TJ-01', newStatus: 'DEGRADED', evidence: 'OBSERVED', desc: 'Junction J-17 enters backup mode.', cause: 'Power loss, battery active' },
      { t: 9, type: 'CAPACITY_DROP', nodeId: 'TJ-01', evidence: 'PREDICTED', desc: 'Backup capacity drops.', cause: 'Battery draining' },
      { t: 14, type: 'DEGRADATION', edgeId: 'e6', newStatus: 'DEGRADED', evidence: 'PREDICTED', desc: 'Traffic throughput degrades.', cause: 'Signal timing lost' },
      { t: 18, type: 'DEGRADATION', nodeId: 'ER-01', newStatus: 'DEGRADED', evidence: 'PREDICTED', desc: 'Emergency Route E-2 becomes congested.', cause: 'Gridlock spreading' },
      { t: 22, type: 'DEGRADATION', nodeId: 'EM-01', newStatus: 'DEGRADED', evidence: 'INFERRED', desc: 'Ambulance delay increases.', cause: 'Route E-2 congestion' },
      { t: 27, type: 'DEGRADATION', nodeId: 'HO-01', newStatus: 'PREDICTED_RISK', evidence: 'PREDICTED', desc: 'Hospital H-01 accessibility becomes high risk.', cause: 'Ambulance delays > 15min' },
    ],

    interventions: [
      { 
        id: 'int-gen', title: 'Deploy Mobile Generator to S-04 + Traffic Control', 
        desc: 'Dispatch mobile power unit and deploy traffic officers at J-17 and J-04.',
        requiredResources: { mobileGenerators: 1, trafficUnits: 4 },
        expectedSetupMin: 12,
        operationalFeasibility: 91,
        resourceCost: 'MEDIUM',
        expectedImpactReductionPct: 72,
        cascadeReduction: 3,
        recoveryImprovementMin: 44,
        emergencyAccessibilityImprovementPct: 55,
        potentialSideEffects: ['Depletes 66% of available traffic units'],
        assumptions: ['Mobile generator can power critical circuits', 'Traffic officers arrive within 10 min'],
        priority: 1
      },
      { 
        id: 'int-reroute', title: 'Emergency Rerouting Only', 
        desc: 'Reroute emergency vehicles via alternate corridors without addressing power.',
        requiredResources: { trafficUnits: 2 },
        expectedSetupMin: 5,
        operationalFeasibility: 98,
        resourceCost: 'LOW',
        expectedImpactReductionPct: 25,
        cascadeReduction: 0,
        recoveryImprovementMin: 5,
        emergencyAccessibilityImprovementPct: 20,
        potentialSideEffects: ['Does not address root cause', 'Telecom degradation still progresses', 'Hospital generator fuel continues to drain'],
        assumptions: ['Alternate routes have sufficient spare capacity'],
        priority: 2
      }
    ]
  }
};
