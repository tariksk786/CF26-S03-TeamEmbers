export type NodeStatus = 'OPERATIONAL' | 'DEGRADED' | 'FAILED' | 'PREDICTED_RISK' | 'RECOVERING' | 'UNKNOWN';
export type EvidenceType = 'OBSERVED' | 'PREDICTED' | 'INFERRED';
export type NodeType = 'power' | 'water' | 'traffic' | 'hospital' | 'telecom' | 'bridge' | 'shelter' | 'fire_station' | 'ambulance_station' | 'emergency_route';
export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type IncidentStatus = 'UNASSIGNED' | 'ASSIGNED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'STABILIZING' | 'RESOLVED' | 'MONITORING';
export type TicketStatus = 'GENERATED' | 'ASSIGNED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'FAILED';
export type InfraCategory = 'POWER' | 'ROAD' | 'TRAFFIC' | 'HOSPITAL' | 'TELECOM' | 'WATER' | 'FIRE_EMS';

export interface InfraNode {
  id: string;
  name: string;
  type: NodeType;
  zone: string;
  lat: number;
  lng: number;

  status: NodeStatus;
  serviceState?: string; // Domain-specific label
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
  dataProvenance?: 'OPENSTREETMAP' | 'LIFEGRID_SIMULATION' | 'DERIVED';
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

export interface AgencyResource {
  id: string;
  agencyCategory: string;
  resourceType: string;
  total: number;
  available: number;
  deployed: number;
  unit?: string;
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
  emergencyAccessibility?: number;
  networkCongestion?: number;
  dataConfidence?: number;
  recoveryProgress?: number;
  waterServiceAvailability?: number;
  recoveryTimeMin?: number;
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

// ─── V2 Types ─────────────────────────────────────────────────────────────────

export interface Incident {
  id: string;
  nodeId: string;
  priority: IncidentPriority;
  score: number;
  status: IncidentStatus;
  title: string;
  category: InfraCategory;
  lifeSafetyImpact: number;
  populationAffected: number;
  cascadeGrowthRisk: number;
  timeToCriticalMinutes: number;
  dataConfidence: number;
  recoveryLeverage: number;
  emergencyAccessImpact: number;
  serviceState: string;
  responsibleAgency: string;
  whyPriority: string;
  downstreamEffects: string[];
  assignedActions?: string[];
  resourcesAllocated?: Record<string, number>;
  nextEscalationThreshold?: string;
  rootCauseIncidentId?: string;
  downstreamIncidents?: Incident[];
  isRoot?: boolean;
}

export interface CoordinatedResponse {
  id: string;
  incidentId: string;
  incidentTitle: string;
  priority: IncidentPriority;
  category: InfraCategory;
  infrastructureAction: {
    target: string;
    actions: {
      description: string;
      setup_time_minutes: number;
      required_resources: Record<string, number>;
      feasibility: string;
    }[];
  };
  agencyAction: {
    primary_agency: string;
    actions: string[];
    coordination_needed: boolean;
  };
  emergencyAction: {
    actions: string[];
    ems_rerouting_needed: boolean;
  };
  publicAction: {
    advisory_needed: boolean;
    actions: string[];
    affected_area: string;
    severity: string;
  };
  verificationConditions: {
    metric: string;
    condition: string;
    threshold: string;
  }[];
  noActionComparison: {
    cascade_depth_no_action: number;
    cascade_depth_with_action: number;
    population_at_risk_no_action: number;
    population_at_risk_with_action: number;
    emergency_delay_no_action: number;
    emergency_delay_with_action: number;
    recovery_time_no_action: number;
    recovery_time_with_action: number;
  };
  status: string;
}

export interface ActionTicket {
  id: string;
  incidentId: string;
  priority: IncidentPriority;
  responsibleDepartment: string;
  actionDescription: string;
  targetAssetId: string;
  targetAssetName?: string;
  requiredResources: Record<string, number>;
  expectedSetupMinutes: number;
  status: TicketStatus;
  verificationCondition: any[];
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  outcome?: string;
}

export interface PublicAdvisory {
  id: string;
  incidentId: string;
  advisoryType: InfraCategory | string;
  severity: IncidentPriority;
  affectedArea: string;
  whatHappened: string;
  whatToAvoid: string;
  alternative: string;
  estimatedDuration: string;
  nextUpdateTime: string;
  status: string;
  isSimulated: boolean;
  simulatedLabel: string;
}

export interface BusRoute {
  id: string;
  name: string;
  routeNumber: string;
  roadSegments: string[];
  status: string;
  delayMinutes: number;
  diversionInfo?: string;
}

export interface WaterNodeData {
  id: string;
  infrastructureNodeId: string;
  pumpStatus: string;
  pressure: number;
  flow: number;
  storageReserveLiters: number;
  alternateSourceAvailable: boolean;
  hospitalDependency: string[];
  fireDependency: string[];
}

export interface VerificationResult {
  ticketId: string;
  target: string;
  conditionsMet: number;
  conditionsTotal: number;
  verified: boolean;
  recommendation: 'STABILIZING' | 'REASSESS';
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

export const getPriorityColor = (priority: IncidentPriority): string => {
  switch (priority) {
    case 'P1': return '#EF4444'; // red
    case 'P2': return '#F59E0B'; // amber
    case 'P3': return '#3B82F6'; // blue
    case 'P4': return '#22C55E'; // green
    default: return '#94A3B8';
  }
};

export const getPriorityLabel = (priority: IncidentPriority): string => {
  switch (priority) {
    case 'P1': return 'CRITICAL';
    case 'P2': return 'HIGH';
    case 'P3': return 'MODERATE';
    case 'P4': return 'LOW';
    default: return 'UNKNOWN';
  }
};

export const getPriorityBg = (priority: IncidentPriority): string => {
  switch (priority) {
    case 'P1': return 'bg-red-500/15 text-red-500 border-red-500/30';
    case 'P2': return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    case 'P3': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'P4': return 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30';
    default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
};

export const AGENCY_CATEGORIES = [
  'Traffic Control',
  'Municipal Road/Drainage',
  'Water Utility',
  'Power Utility',
  'Telecom Operations',
  'Hospital/Health Operations',
  'EMS / Fire Service',
  'Public Communication',
];

export const COMMUNICATION_CHANNELS = [
  { channel: 'Geo-targeted SMS / CAP alert', type: 'push' },
  { channel: 'Municipal website/app', type: 'pull' },
  { channel: 'Browser notification', type: 'push' },
  { channel: 'Variable Message Sign', type: 'display' },
  { channel: 'Public-transport display', type: 'display' },
  { channel: 'Official communication channel', type: 'broadcast' },
  { channel: 'Emergency helpline/IVR', type: 'interactive' },
  { channel: 'Machine-readable partner feed', type: 'api' },
];
