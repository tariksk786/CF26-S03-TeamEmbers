"""
LIFEGRID Water Response Engine
Evaluates water failures, generates response actions, prioritizes allocation,
and optimizes tanker deployment.
"""


# Water priority allocation order (infrastructure service allocation, NOT individual people)
WATER_PRIORITY_ORDER = [
    "Hospitals and emergency health facilities",
    "Fire/emergency response requirements",
    "Essential residential drinking-water requirement",
    "Emergency shelters/public safety facilities",
    "Commercial/non-critical demand",
]


def evaluate_water_failure(node_id, node_states, water_nodes=None):
    """
    Evaluate the impact of a water node failure.
    Returns assessment dict.
    """
    node = node_states.get(node_id, {})
    node_name = node.get("name", node_id)
    population = node.get("population_served", 0)
    zone = node.get("zone", "Unknown Zone")

    # Find water-specific data
    water_data = None
    if water_nodes:
        for wn in water_nodes:
            if wn.get("infrastructure_node_id") == node_id or wn.get("id") == node_id:
                water_data = wn
                break

    pump_status = "FAILED" if node.get("status") == "FAILED" else node.get("status", "OPERATIONAL")
    pressure = water_data.get("pressure", 0) if water_data else (0 if pump_status == "FAILED" else 100)
    flow = water_data.get("flow", 0) if water_data else (0 if pump_status == "FAILED" else 100)
    reserve = water_data.get("storage_reserve_liters", 0) if water_data else 0
    alternate_available = water_data.get("alternate_source_available", False) if water_data else False
    hospital_deps = water_data.get("hospital_dependency", []) if water_data else []
    fire_deps = water_data.get("fire_dependency", []) if water_data else []

    # Determine affected critical facilities
    critical_facilities = []
    for h_id in hospital_deps:
        h = node_states.get(h_id, {})
        if h:
            critical_facilities.append({"id": h_id, "name": h.get("name", h_id), "type": "HOSPITAL"})
    for f_id in fire_deps:
        f = node_states.get(f_id, {})
        if f:
            critical_facilities.append({"id": f_id, "name": f.get("name", f_id), "type": "FIRE_EMS"})

    # Calculate reserve duration (simplified)
    reserve_duration_hours = 0
    if reserve > 0 and population > 0:
        # Assume 5 liters per person per hour for essential needs
        reserve_duration_hours = round(reserve / (population * 5), 1)

    # Tanker requirement
    tanker_needed = pump_status in ("FAILED", "DEGRADED") and not alternate_available
    tankers_required = 0
    if tanker_needed:
        if len(critical_facilities) > 0:
            tankers_required += 1  # One for critical facilities
        if population > 10000:
            tankers_required += 2
        elif population > 5000:
            tankers_required += 1

    return {
        "node_id": node_id,
        "node_name": node_name,
        "zone": zone,
        "pump_status": pump_status,
        "pressure": pressure,
        "flow": flow,
        "storage_reserve_liters": reserve,
        "reserve_duration_hours": reserve_duration_hours,
        "population_affected": population,
        "critical_facilities_affected": critical_facilities,
        "alternate_source_available": alternate_available,
        "tanker_needed": tanker_needed,
        "tankers_required": tankers_required,
        "repair_needed": pump_status in ("FAILED", "DEGRADED"),
        "estimated_repair_hours": 4 if pump_status == "FAILED" else 2,
        "priority_allocation_order": WATER_PRIORITY_ORDER,
    }


def generate_water_actions(assessment):
    """
    Generate possible response actions for a water failure.
    """
    actions = []
    node_name = assessment.get("node_name", "Water Node")

    if assessment.get("alternate_source_available"):
        actions.append({
            "action": "Switch to alternate water supply",
            "description": f"Reroute supply for {node_name} zone to alternate source",
            "setup_time_minutes": 10,
            "resources": {},
            "priority": 1,
            "expected_benefit": "Restores partial supply within 10 minutes",
        })

    actions.append({
        "action": "Isolate failed section",
        "description": f"Isolate {node_name} to prevent pressure loss in connected zones",
        "setup_time_minutes": 8,
        "resources": {"repair_crews": 1},
        "priority": 2,
        "expected_benefit": "Prevents cascade to other water zones",
    })

    if assessment.get("repair_needed"):
        actions.append({
            "action": "Dispatch water repair crew",
            "description": f"Send repair crew to {node_name}",
            "setup_time_minutes": 15,
            "resources": {"repair_crews": 1},
            "priority": 3,
            "expected_benefit": f"Estimated repair: {assessment.get('estimated_repair_hours', 4)} hours",
        })

    if assessment.get("critical_facilities_affected"):
        actions.append({
            "action": "Protect hospital/fire reserves",
            "description": "Ensure critical facility water tanks are topped up from available reserves",
            "setup_time_minutes": 5,
            "resources": {"tankers": 1},
            "priority": 1,
            "expected_benefit": "Critical facility water security maintained",
        })

    if assessment.get("tanker_needed"):
        tankers = assessment.get("tankers_required", 1)
        actions.append({
            "action": "Deploy tanker resources",
            "description": f"Deploy {tankers} tanker(s) for emergency water supply",
            "setup_time_minutes": 20,
            "resources": {"tankers": tankers},
            "priority": 2,
            "expected_benefit": f"Emergency water supply for {assessment.get('population_affected', 0):,} residents",
        })

    if assessment.get("population_affected", 0) > 5000:
        actions.append({
            "action": "Establish temporary public distribution points",
            "description": "Set up 2-3 distribution points in affected zone",
            "setup_time_minutes": 30,
            "resources": {"tankers": 1},
            "priority": 3,
            "expected_benefit": "Public access to drinking water",
        })

    actions.append({
        "action": "Activate rotational supply",
        "description": "If partial supply available, rotate supply across zones",
        "setup_time_minutes": 15,
        "resources": {},
        "priority": 4,
        "expected_benefit": "Fair distribution of limited supply",
    })

    actions.append({
        "action": "Issue public water advisory",
        "description": "Inform residents of reduced supply and conservation measures",
        "setup_time_minutes": 5,
        "resources": {},
        "priority": 1,
        "expected_benefit": "Reduces demand, prevents panic",
    })

    return sorted(actions, key=lambda a: a["priority"])


def prioritize_water_allocation(demands, available_supply_pct):
    """
    Prioritize water allocation by infrastructure category.
    Returns allocation percentages.
    """
    # Default allocation when supply is constrained
    if available_supply_pct >= 80:
        return {
            "hospitals": 100,
            "fire_ems": 100,
            "residential_essential": 100,
            "shelters": 100,
            "commercial": 80,
        }
    elif available_supply_pct >= 50:
        return {
            "hospitals": 100,
            "fire_ems": 100,
            "residential_essential": 70,
            "shelters": 80,
            "commercial": 30,
        }
    elif available_supply_pct >= 25:
        return {
            "hospitals": 100,
            "fire_ems": 90,
            "residential_essential": 40,
            "shelters": 50,
            "commercial": 0,
        }
    else:
        return {
            "hospitals": 80,
            "fire_ems": 70,
            "residential_essential": 20,
            "shelters": 30,
            "commercial": 0,
        }


def optimize_tanker_deployment(tankers, demands):
    """
    Optimize tanker deployment across demands.
    tankers: list of {id, capacity_liters, current_location, travel_time_minutes, availability}
    demands: list of {zone, priority, population, critical_facilities, reserve_remaining}
    Returns assignment list.
    """
    available_tankers = [t for t in tankers if t.get("availability") == "AVAILABLE"]

    # Sort demands by priority (critical facilities first, then population)
    sorted_demands = sorted(demands, key=lambda d: (
        0 if d.get("critical_facilities") else 1,
        -d.get("population", 0),
        d.get("reserve_remaining", 999),
    ))

    assignments = []
    used_tankers = set()

    for demand in sorted_demands:
        if not available_tankers:
            break

        # Find best tanker (closest available)
        best_tanker = None
        best_time = float("inf")
        for t in available_tankers:
            if t["id"] in used_tankers:
                continue
            travel = t.get("travel_time_minutes", 30)
            if travel < best_time:
                best_time = travel
                best_tanker = t

        if best_tanker:
            used_tankers.add(best_tanker["id"])
            assignments.append({
                "tanker_id": best_tanker["id"],
                "destination": demand.get("zone", "Unknown"),
                "priority_reason": "Hospital reserve" if demand.get("critical_facilities") else f"Highest-impact zone ({demand.get('population', 0):,} pop.)",
                "estimated_arrival_minutes": best_tanker.get("travel_time_minutes", 15),
                "capacity_liters": best_tanker.get("capacity_liters", 10000),
            })

    return assignments
