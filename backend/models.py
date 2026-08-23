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
