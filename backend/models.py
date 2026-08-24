from sqlalchemy import Column, String, Float, Integer, Boolean, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class CityZone(Base):
    __tablename__ = "city_zones"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    polygon = Column(JSON, nullable=True) # Storing geometry as JSON for simplicity
    population_estimate = Column(Integer, default=0)
    critical_facility_count = Column(Integer, default=0)

class InfrastructureNode(Base):
    __tablename__ = "infrastructure_nodes"
    id = Column(String, primary_key=True)
    osm_id = Column(String, nullable=True)
    name = Column(String, nullable=True)
    type = Column(String, nullable=False) # POWER, TRAFFIC, ROAD, HOSPITAL, TELECOM, WATER, FIRE_EMS, BRIDGE, PUBLIC_FACILITY
    zone_id = Column(String, ForeignKey("city_zones.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="OPERATIONAL") # OPERATIONAL, DEGRADED, FAILED, PREDICTED_RISK, RECOVERING, UNKNOWN
    service_state = Column(String, nullable=True) # Domain-specific operational label
    capacity = Column(Integer, default=100)
    current_load = Column(Integer, default=0)
    criticality = Column(Integer, default=50)
    population_served = Column(Integer, default=0)
    backup_available = Column(Boolean, default=False)
    backup_type = Column(String, nullable=True)
    backup_duration_minutes = Column(Integer, default=0)
    backup_remaining_minutes = Column(Integer, default=0)
    recovery_estimate_minutes = Column(Integer, default=0)
    data_confidence = Column(Float, default=1.0)
    evidence_category = Column(String, default="INFERRED") # OBSERVED, PREDICTED, INFERRED
    data_source = Column(String, nullable=False)
    data_provenance = Column(String, default="LIFEGRID_SIMULATION") # OPENSTREETMAP, LIFEGRID_SIMULATION, DERIVED
    metadata_json = Column(JSON, nullable=True)

class RoadNode(Base):
    __tablename__ = "road_nodes"
    id = Column(String, primary_key=True) # e.g. OSM node id
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    is_junction = Column(Boolean, default=False)

class RoadEdge(Base):
    __tablename__ = "road_edges"
    id = Column(String, primary_key=True) # combined source_target
    source_node = Column(String, ForeignKey("road_nodes.id"), nullable=False)
    target_node = Column(String, ForeignKey("road_nodes.id"), nullable=False)
    name = Column(String, nullable=True)
    distance = Column(Float, nullable=False)
    road_type = Column(String, nullable=True)
    normal_speed = Column(Float, default=40.0)
    normal_travel_time = Column(Float, default=0.0)
    current_speed = Column(Float, default=40.0)
    current_travel_time = Column(Float, default=0.0)
    capacity = Column(Integer, default=100)
    status = Column(String, default="OPERATIONAL")
    blocked = Column(Boolean, default=False)
    confidence = Column(Float, default=1.0)

class DependencyEdge(Base):
    __tablename__ = "dependency_edges"
    id = Column(String, primary_key=True)
    source_id = Column(String, nullable=False) # References infrastructure or road
    target_id = Column(String, nullable=False)
    dependency_type = Column(String, nullable=False)
    strength = Column(Float, default=1.0)
    propagation_delay_minutes = Column(Integer, default=0)
    minimum_capacity_requirement = Column(Integer, default=0)
    fallback_available = Column(Boolean, default=False)
    fallback_duration_minutes = Column(Integer, default=0)
    confidence = Column(Float, default=1.0)
    assumption = Column(String, nullable=True)
    data_source = Column(String, default="LIFEGRID_SIMULATION")

class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(String, primary_key=True)
    version = Column(String, nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    initial_state = Column(JSON, nullable=True)
    initial_disruption = Column(JSON, nullable=True)
    assumptions = Column(JSON, nullable=True)
    available_resources = Column(JSON, nullable=True)
    candidate_interventions = Column(JSON, nullable=True)
    recovery_sequence = Column(JSON, nullable=True)

class ScenarioEvent(Base):
    __tablename__ = "scenario_events"
    id = Column(String, primary_key=True)
    scenario_id = Column(String, ForeignKey("scenarios.id"), nullable=False)
    time_offset_minutes = Column(Integer, nullable=False)
    event_type = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)

class Resource(Base):
    __tablename__ = "resources"
    id = Column(String, primary_key=True)
    resource_type = Column(String, nullable=False)
    total = Column(Integer, default=0)
    available = Column(Integer, default=0)
    unit = Column(String, nullable=True)

class EmergencyVehicle(Base):
    __tablename__ = "emergency_vehicles"
    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)
    ems_priority = Column(String, nullable=True)
    current_road_node = Column(String, nullable=True)
    destination_hospital_id = Column(String, nullable=True)
    status = Column(String, default="AVAILABLE")
    normal_eta = Column(Float, nullable=True)
    current_eta = Column(Float, nullable=True)
    data_source = Column(String, default="LIFEGRID_SIMULATION")

class Simulation(Base):
    __tablename__ = "simulations"
    id = Column(String, primary_key=True)
    scenario_id = Column(String, ForeignKey("scenarios.id"), nullable=False)
    status = Column(String, default="CREATED") # CREATED, RUNNING, PAUSED, COMPLETED
    current_time_minutes = Column(Integer, default=0)
    telemetry_loss_percentage = Column(Integer, default=0)

class SimulationEvent(Base):
    __tablename__ = "simulation_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    simulation_id = Column(String, ForeignKey("simulations.id"), nullable=False)
    time_minutes = Column(Integer, nullable=False)
    event_type = Column(String, nullable=False)
    node_id = Column(String, nullable=True)
    old_state = Column(String, nullable=True)
    new_state = Column(String, nullable=True)
    details = Column(JSON, nullable=True)

class Intervention(Base):
    __tablename__ = "interventions"
    id = Column(String, primary_key=True)
    simulation_id = Column(String, ForeignKey("simulations.id"), nullable=False)
    name = Column(String, nullable=False)
    plan_type = Column(String, nullable=False) # PLAN_A, PLAN_B, RECOMMENDED, NO_ACTION
    required_resources = Column(JSON, nullable=True)
    description = Column(String, nullable=True)

class InterventionResult(Base):
    __tablename__ = "intervention_results"
    id = Column(Integer, primary_key=True, autoincrement=True)
    intervention_id = Column(String, ForeignKey("interventions.id"), nullable=False)
    expected_cascade_depth = Column(Integer, default=0)
    population_exposure = Column(Integer, default=0)
    critical_facility_exposure = Column(Integer, default=0)
    emergency_delay_minutes = Column(Float, default=0.0)
    accessibility_score = Column(Float, default=0.0)
    recovery_time_minutes = Column(Integer, default=0)
    operational_feasibility = Column(Float, default=1.0)
    secondary_risk = Column(Float, default=0.0)
    traffic_disruption = Column(Float, default=0.0)

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    simulation_id = Column(String, nullable=True)
    scenario_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    decision = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    reason = Column(String, nullable=True)
    simulated_result = Column(JSON, nullable=True)

# ═══════════════════════════  V2 Models  ══════════════════════════════════════

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True)
    simulation_id = Column(String, nullable=False)
    root_node_id = Column(String, nullable=False)
    priority = Column(String, default="P4")  # P1, P2, P3, P4
    status = Column(String, default="UNASSIGNED")  # UNASSIGNED, ASSIGNED, ACKNOWLEDGED, IN_PROGRESS, STABILIZING, RESOLVED, MONITORING
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)  # POWER, ROAD, TRAFFIC, HOSPITAL, TELECOM, WATER, FIRE_EMS
    life_safety_impact = Column(Float, default=0.0)
    population_affected = Column(Integer, default=0)
    cascade_growth_risk = Column(Float, default=0.0)
    time_to_critical_minutes = Column(Integer, default=60)
    data_confidence = Column(Float, default=1.0)
    recovery_leverage = Column(Integer, default=0)  # How many downstream risks fixed
    root_cause_incident_id = Column(String, nullable=True)  # For alert grouping
    downstream_effects = Column(JSON, nullable=True)  # List of downstream node IDs
    assigned_actions = Column(JSON, nullable=True)
    resources_allocated = Column(JSON, nullable=True)
    next_escalation_threshold = Column(String, nullable=True)
    why_priority = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ActionTicket(Base):
    __tablename__ = "action_tickets"
    id = Column(String, primary_key=True)
    incident_id = Column(String, nullable=False)
    simulation_id = Column(String, nullable=False)
    priority = Column(String, default="P4")
    responsible_department = Column(String, nullable=False)  # Traffic Control, Municipal Road/Drainage, Water Utility, etc.
    action_description = Column(String, nullable=False)
    target_asset_id = Column(String, nullable=True)
    required_resources = Column(JSON, nullable=True)
    expected_setup_minutes = Column(Integer, default=10)
    status = Column(String, default="GENERATED")  # GENERATED, ASSIGNED, ACKNOWLEDGED, IN_PROGRESS, COMPLETED, VERIFIED, FAILED
    verification_condition = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    outcome = Column(String, nullable=True)

class CoordinatedResponse(Base):
    __tablename__ = "coordinated_responses"
    id = Column(String, primary_key=True)
    simulation_id = Column(String, nullable=False)
    incident_id = Column(String, nullable=False)
    infrastructure_action = Column(JSON, nullable=True)
    agency_action = Column(JSON, nullable=True)
    emergency_action = Column(JSON, nullable=True)
    public_action = Column(JSON, nullable=True)
    verification_conditions = Column(JSON, nullable=True)
    status = Column(String, default="PROPOSED")
    created_at = Column(DateTime, default=datetime.utcnow)

class PublicAdvisory(Base):
    __tablename__ = "public_advisories"
    id = Column(String, primary_key=True)
    simulation_id = Column(String, nullable=False)
    incident_id = Column(String, nullable=True)
    advisory_type = Column(String, nullable=False)  # ROAD, WATER, POWER, TELECOM, EMERGENCY, GENERAL
    affected_area = Column(String, nullable=True)
    what_happened = Column(String, nullable=True)
    what_to_avoid = Column(String, nullable=True)
    alternative = Column(String, nullable=True)
    estimated_duration = Column(String, nullable=True)
    next_update_time = Column(String, nullable=True)
    severity = Column(String, default="MODERATE")
    status = Column(String, default="DRAFT")  # DRAFT, APPROVED, PUBLISHED, EXPIRED
    created_at = Column(DateTime, default=datetime.utcnow)

class WaterNode(Base):
    __tablename__ = "water_nodes"
    id = Column(String, primary_key=True)
    infrastructure_node_id = Column(String, nullable=False)
    pump_status = Column(String, default="OPERATIONAL")
    pressure = Column(Float, default=100.0)
    flow = Column(Float, default=100.0)
    storage_reserve_liters = Column(Integer, default=50000)
    alternate_source_available = Column(Boolean, default=False)
    alternate_source_id = Column(String, nullable=True)
    hospital_dependency = Column(JSON, nullable=True)  # List of hospital IDs depending on this
    fire_dependency = Column(JSON, nullable=True)  # List of fire station IDs

class BusRoute(Base):
    __tablename__ = "bus_routes"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    route_number = Column(String, nullable=True)
    road_segments = Column(JSON, nullable=True)  # List of road edge IDs or node references
    key_stops = Column(JSON, nullable=True)
    status = Column(String, default="NORMAL")  # NORMAL, DIVERTED, PARTIALLY_SUSPENDED, SUSPENDED
    delay_minutes = Column(Integer, default=0)
    diversion_info = Column(String, nullable=True)

class TankerResource(Base):
    __tablename__ = "tanker_resources"
    id = Column(String, primary_key=True)
    capacity_liters = Column(Integer, default=10000)
    current_location = Column(String, nullable=True)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    availability = Column(String, default="AVAILABLE")  # AVAILABLE, DEPLOYED, MAINTENANCE
    travel_time_minutes = Column(Integer, default=15)
    assigned_zone = Column(String, nullable=True)

class AgencyResource(Base):
    __tablename__ = "agency_resources"
    id = Column(String, primary_key=True)
    agency_category = Column(String, nullable=False)  # Traffic Control, Municipal Road/Drainage, Water Utility, etc.
    resource_type = Column(String, nullable=False)
    total = Column(Integer, default=0)
    available = Column(Integer, default=0)
    deployed = Column(Integer, default=0)
    unit = Column(String, nullable=True)
