export type NodeStatus = 'OPERATIONAL' | 'DEGRADED' | 'FAILED' | 'PREDICTED_RISK' | 'RECOVERING' | 'UNKNOWN';
export type EvidenceType = 'OBSERVED' | 'PREDICTED' | 'INFERRED';
export type NodeType = 'power' | 'water' | 'traffic' | 'hospital' | 'telecom' | 'bridge' | 'shelter' | 'fire_station' | 'ambulance_station' | 'emergency_route';

export interface InfraNode {
  id: string;
  name: string;
  type: NodeType;
  zone: string;
  lat: number;
  lng: number;

  status: NodeStatus;
  evidence: EvidenceType;
  criticalityScore: number;
  
  capacity: number;      // 0 to 100
  currentLoad: number;   // 0 to 100
  populationServed: number;

  backupAvailable: boolean;
  backupType?: string;
  backupDurationMin?: number;

  recoveryEstimateMin?: number;
  lastTelemetryOffset?: number; // seconds ago
  dataConfidence: number; // 0 to 100
}

export interface DepEdge {
  id: string;
  source: string;
  target: string;
  dependencyType: string;
  strength: number;       // 0.0 to 1.0
  delayMin: number;       // propagation delay
  minCapacityReq: number; // 0 to 100
  fallbackAvailable: boolean;
  fallbackDurationMin?: number;
  confidence: number;
  currentState: 'ACTIVE' | 'DEGRADED' | 'FAILED';
}

export interface ResourceCounts {
  mobileGenerators: number;
  trafficUnits: number;
  repairCrews: number;
  ambulances: number;
  fireUnits: number;
}

export interface Intervention {
  id: string;
  title: string;
  desc: string;
  
  requiredResources: Partial<ResourceCounts>;
  expectedSetupMin: number;
  operationalFeasibility: number; // 0 to 100
  resourceCost: 'LOW' | 'MEDIUM' | 'HIGH';
  
  expectedImpactReductionPct: number;
  cascadeReduction: number;
  recoveryImprovementMin: number;
  emergencyAccessibilityImprovementPct: number;

  potentialSideEffects: string[];
  assumptions: string[];
  priority: number;
}

export interface TimedEvent {
  t: number; // seconds from start
  type: 'FAILURE' | 'DEGRADATION' | 'RECOVERY' | 'CAPACITY_DROP';
  nodeId?: string;
  edgeId?: string;
  newStatus?: NodeStatus;
  evidence: EvidenceType;
  desc: string;
  cause: string;
}

export interface Scenario {
  scenarioId: string;
  version: string;
  name: string;
  desc: string;
  startTime: string; // ISO or "10:00:00"
  
  initialNodes: Record<string, InfraNode>;
  initialEdges: DepEdge[];
  
  availableResources: ResourceCounts;
  
  timedEvents: TimedEvent[];
  interventions: Intervention[];
  
  // Explicitly for the Compound Scenario where rules multiply
  compoundRules?: {
    conditions: { type: string; status: NodeStatus }[];
    effect: { targetType: string; capacityMultiplier: number; description: string };
  }[];
}

export interface SimulationMetrics {
  populationExposed: number;
  populationAtRisk: number;
  criticalFacilitiesAffected: number;
  emergencyCount: number;
  cascadeDepth: number;
  emergencyDelayMin: number;
  resilienceScore: number; // 0-100
  lifeSafetyImpactScore: number; // 0-100
  riskScore: number; // 0-100
}

export interface EmergencyVehicle {
  id: string;
  type: 'AMBULANCE' | 'FIRE';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  targetNodeId: string;
  currentDelayMin: number;
  routeState: 'CLEAR' | 'DEGRADED' | 'SEVERE_CONGESTION' | 'BLOCKED';
  interventionNeed: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // AI Route Recommendation specific fields
  currentRoute: string[];
  recommendedRoute?: string[];
  normalETA: number;
  currentETA: number;
  projectedETA?: number;
  recommendedRouteStatus?: 'SAFE' | 'DEGRADED' | 'UNKNOWN';
  rerouteReason?: string;
  corridorStatus: 'NOT_ACTIVE' | 'ACTIVE';
  approvalStatus: 'PENDING' | 'APPROVED' | 'NOT_REQUIRED';
}

export interface TimelineEvent {
  id: string;
  timestamp: string; // formatted time e.g. "10:17:00"
  type: 'OBSERVED' | 'PREDICTED' | 'SIMULATED' | 'INTERVENTION' | 'RECOVERY';
  entity: string;
  status: string;
  desc: string;
  confidence?: number;
}

// Math Helpers
export const safeNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) && !Number.isNaN(n) ? n : fallback;
};

export const safeDivide = (a: unknown, b: unknown, fallback = 0): number => {
  const numA = safeNumber(a);
  const numB = safeNumber(b);
  if (numB === 0) return fallback;
  const result = numA / numB;
  return Number.isFinite(result) ? result : fallback;
};

export const clampScore = (value: unknown, min = 0, max = 100): number => {
  const n = safeNumber(value);
  return Math.max(min, Math.min(max, n));
};

export const getRiskLevel = (riskScore: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' => {
  if (riskScore >= 75) return 'CRITICAL';
  if (riskScore >= 50) return 'HIGH';
  if (riskScore >= 25) return 'MODERATE';
  return 'LOW';
};
