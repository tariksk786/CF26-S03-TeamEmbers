import os
import json
import logging
from backend.database import SessionLocal, Base, engine
from backend.models import (
    CityZone, InfrastructureNode, RoadNode, RoadEdge, 
    DependencyEdge, Scenario, Resource, EmergencyVehicle
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
SCENARIO_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios")

def load_json(filepath):
    if not os.path.exists(filepath):
        logger.warning(f"File not found: {filepath}")
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def seed():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Seed Zones
        zones_data = load_json(os.path.join(DATA_DIR, "nagpur_zones.geojson"))
        if 'features' in zones_data:
            for feature in zones_data['features']:
                props = feature.get('properties', {})
                zone_id = props.get('id') or feature.get('id')
                if not zone_id: continue
                if not db.query(CityZone).filter(CityZone.id == zone_id).first():
                    zone = CityZone(
                        id=zone_id,
                        name=props.get('name', 'Unknown Zone'),
                        polygon=feature.get('geometry'),
                        population_estimate=props.get('population_estimate', 0),
                        critical_facility_count=props.get('critical_facility_count', 0)
                    )
                    db.add(zone)
        
        # Seed Infrastructure
        infra_data = load_json(os.path.join(DATA_DIR, "lifegrid_infrastructure_nodes.json"))
        for item in infra_data:
            if not db.query(InfrastructureNode).filter(InfrastructureNode.id == item['id']).first():
                node = InfrastructureNode(
                    id=item['id'],
                    osm_id=item.get('osm_id'),
                    name=item.get('name'),
                    type=item.get('type'),
                    zone_id=item.get('zone_id'),
                    latitude=item.get('latitude', 0.0),
                    longitude=item.get('longitude', 0.0),
                    status=item.get('status', 'OPERATIONAL'),
                    capacity=item.get('capacity', 100),
                    current_load=item.get('current_load', 0),
                    criticality=item.get('criticality', 50),
                    population_served=item.get('population_served', 0),
                    backup_available=item.get('backup_available', False),
                    backup_type=item.get('backup_type'),
                    backup_duration_minutes=item.get('backup_duration_minutes', 0),
                    backup_remaining_minutes=item.get('backup_remaining_minutes', 0),
                    recovery_estimate_minutes=item.get('recovery_estimate_minutes', 0),
                    data_confidence=item.get('data_confidence', 1.0),
                    evidence_category=item.get('evidence_category', 'INFERRED'),
                    data_source=item.get('data_source', 'LIFEGRID_SIMULATION'),
                    metadata_json=item.get('metadata')
                )
                db.add(node)
                
        # Seed Road Graph
        road_data = load_json(os.path.join(DATA_DIR, "nagpur_road_graph.json"))
        nodes = road_data.get('nodes', [])
        for node in nodes:
            if not db.query(RoadNode).filter(RoadNode.id == str(node['id'])).first():
                db.add(RoadNode(
                    id=str(node['id']),
                    latitude=node.get('lat', 0.0),
                    longitude=node.get('lon', 0.0),
                    is_junction=node.get('is_junction', False)
                ))
        
        edges = road_data.get('edges', [])
        for edge in edges:
            edge_id = f"{edge['source']}_{edge['target']}"
            if not db.query(RoadEdge).filter(RoadEdge.id == edge_id).first():
                db.add(RoadEdge(
                    id=edge_id,
                    source_node=str(edge['source']),
                    target_node=str(edge['target']),
                    name=edge.get('name'),
                    distance=edge.get('distance', 0.0),
                    road_type=edge.get('highway'),
                    normal_speed=edge.get('speed', 40.0),
                    normal_travel_time=edge.get('travel_time', 0.0),
                    current_speed=edge.get('speed', 40.0),
                    current_travel_time=edge.get('travel_time', 0.0),
                    capacity=edge.get('capacity', 100),
                    status='OPERATIONAL',
                    blocked=False,
                    confidence=1.0
                ))
                
        # Seed Dependencies
        deps_data = load_json(os.path.join(DATA_DIR, "lifegrid_dependencies.json"))
        for dep in deps_data:
            if not db.query(DependencyEdge).filter(DependencyEdge.id == dep['id']).first():
                db.add(DependencyEdge(
                    id=dep['id'],
                    source_id=dep['source_id'],
                    target_id=dep['target_id'],
                    dependency_type=dep['dependency_type'],
                    strength=dep.get('strength', 1.0),
                    propagation_delay_minutes=dep.get('propagation_delay_minutes', 0),
                    minimum_capacity_requirement=dep.get('minimum_capacity_requirement', 0),
                    fallback_available=dep.get('fallback_available', False),
                    fallback_duration_minutes=dep.get('fallback_duration_minutes', 0),
                    confidence=dep.get('confidence', 1.0),
                    assumption=dep.get('assumption'),
                    data_source=dep.get('data_source', 'LIFEGRID_SIMULATION')
                ))

        # Seed Resources
        resources_data = load_json(os.path.join(DATA_DIR, "lifegrid_resources.json"))
        for res in resources_data:
            if not db.query(Resource).filter(Resource.id == res['resource_id']).first():
                db.add(Resource(
                    id=res['resource_id'],
                    resource_type=res['resource_type'],
                    total=res.get('total', 0),
                    available=res.get('available', 0),
                    unit=res.get('unit')
                ))

        # Seed Emergency Vehicles
        vehicles_data = load_json(os.path.join(DATA_DIR, "lifegrid_emergency_vehicles.json"))
        for veh in vehicles_data:
            if not db.query(EmergencyVehicle).filter(EmergencyVehicle.id == veh['vehicle_id']).first():
                db.add(EmergencyVehicle(
                    id=veh['vehicle_id'],
                    type=veh['type'],
                    ems_priority=veh.get('ems_priority'),
                    current_road_node=veh.get('current_road_node'),
                    destination_hospital_id=veh.get('destination_hospital_id'),
                    status=veh.get('status', 'AVAILABLE'),
                    data_source=veh.get('data_source', 'LIFEGRID_SIMULATION')
                ))
                
        # Seed Scenarios
        for filename in os.listdir(SCENARIO_DIR):
            if filename.endswith(".json"):
                scenario_data = load_json(os.path.join(SCENARIO_DIR, filename))
                sc_id = scenario_data.get('scenario_id')
                if sc_id and not db.query(Scenario).filter(Scenario.id == sc_id).first():
                    db.add(Scenario(
                        id=sc_id,
                        version=scenario_data.get('version'),
                        name=scenario_data.get('name', sc_id),
                        description=scenario_data.get('description'),
                        initial_state=scenario_data.get('initial_state'),
                        initial_disruption=scenario_data.get('initial_disruption'),
                        assumptions=scenario_data.get('assumptions'),
                        available_resources=scenario_data.get('available_resources'),
                        candidate_interventions=scenario_data.get('candidate_interventions'),
                        recovery_sequence=scenario_data.get('recovery_sequence')
                    ))
        
        db.commit()
        logger.info("Database seeded successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
