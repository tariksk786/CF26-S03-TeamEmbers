"""
LIFEGRID Coordinated Response Engine
Generates 5-component coordinated action plans, traffic actions,
distributed diversion, resource allocation, and adaptive reassessment.
"""
import uuid
from backend.engines.priority_engine import get_category, get_responsible_agency, get_service_state, CRITICAL_TYPES


# ─── Response Templates by Category ───────────────────────────────────────────

INFRASTRUCTURE_ACTIONS = {
    "POWER": [
        {"action": "Deploy mobile generator to affected substation", "setup_min": 12, "resources": {"generators": 1}},
        {"action": "Activate backup power switching", "setup_min": 5, "resources": {}},
        {"action": "Isolate failed section to prevent cascade", "setup_min": 8, "resources": {"repair_crews": 1}},
    ],
    "ROAD": [
        {"action": "Deploy drainage/pumping response", "setup_min": 20, "resources": {"drainage_teams": 1}},
        {"action": "Restrict entry to affected road", "setup_min": 5, "resources": {"traffic_teams": 1}},
        {"action": "Activate distributed rerouting", "setup_min": 10, "resources": {"traffic_teams": 2}},
    ],
    "TRAFFIC": [
        {"action": "Deploy traffic officers for manual control", "setup_min": 8, "resources": {"traffic_teams": 2}},
        {"action": "Implement temporary signal timing changes", "setup_min": 5, "resources": {"traffic_teams": 1}},
        {"action": "Activate emergency route prioritization", "setup_min": 3, "resources": {}},
    ],
    "HOSPITAL": [
        {"action": "Activate backup generator if available", "setup_min": 2, "resources": {}},
        {"action": "Initiate patient load redistribution", "setup_min": 15, "resources": {}},
        {"action": "Notify alternate hospitals for diversion", "setup_min": 5, "resources": {}},
    ],
    "TELECOM": [
        {"action": "Deploy mobile communication unit", "setup_min": 15, "resources": {"repair_crews": 1}},
        {"action": "Activate backup communication channels", "setup_min": 3, "resources": {}},
        {"action": "Switch to last-known-state telemetry mode", "setup_min": 1, "resources": {}},
    ],
    "WATER": [
        {"action": "Switch to alternate water supply if available", "setup_min": 10, "resources": {}},
        {"action": "Isolate failed section", "setup_min": 8, "resources": {"repair_crews": 1}},
        {"action": "Deploy water repair crew", "setup_min": 15, "resources": {"repair_crews": 1}},
        {"action": "Deploy tanker resources", "setup_min": 20, "resources": {"tankers": 2}},
        {"action": "Establish temporary public distribution points", "setup_min": 30, "resources": {"tankers": 1}},
    ],
    "FIRE_EMS": [
        {"action": "Redistribute emergency vehicles", "setup_min": 5, "resources": {}},
        {"action": "Activate mutual aid agreements", "setup_min": 10, "resources": {}},
        {"action": "Prioritize high-acuity calls", "setup_min": 2, "resources": {}},
    ],
}

EMERGENCY_ACTIONS = {
    "POWER": ["Verify hospital/fire station backup status", "Reroute EMS away from signal-failure zones"],
    "ROAD": ["Activate alternate emergency route", "Pre-position ambulances at safe corridors"],
    "TRAFFIC": ["Implement emergency signal override", "Deploy traffic officers at critical junctions"],
    "HOSPITAL": ["Redirect incoming ambulances to alternate facility", "Assess route reliability to alternatives"],
    "TELECOM": ["Switch to radio-based dispatch", "Alert EMS of potential communication gaps"],
    "WATER": ["Protect hospital/fire station water reserves", "Verify fire hydrant availability"],
    "FIRE_EMS": ["Coordinate mutual aid coverage", "Prioritize life-threatening calls"],
}

PUBLIC_ACTIONS = {
    "POWER": ["Be aware of potential traffic signal outages in the area", "Conserve device battery"],
    "ROAD": ["Avoid the affected road", "Use recommended alternate corridors", "Expect delays on nearby roads"],
    "TRAFFIC": ["Expect delays at affected junctions", "Allow extra travel time"],
    "HOSPITAL": ["Non-emergency visits may experience delays", "Use alternate facilities if possible"],
    "TELECOM": ["Communication services may be intermittent", "Use alternate communication methods"],
    "WATER": ["Conserve water usage", "Collect emergency water from distribution points if needed"],
    "FIRE_EMS": ["Call emergency services only for genuine emergencies", "Be aware of potential response delays"],
}

VERIFICATION_CONDITIONS = {
    "POWER": [
        {"metric": "downstream_nodes_powered", "condition": "stable power restored", "threshold": ">90%"},
        {"metric": "backup_drain_stopped", "condition": "backups stop draining", "threshold": "stable"},
    ],
    "ROAD": [
        {"metric": "road_throughput", "condition": "throughput above threshold", "threshold": ">70%"},
        {"metric": "water_level", "condition": "water level below threshold", "threshold": "<safe"},
        {"metric": "average_speed", "condition": "average travel speed improving", "threshold": "increasing"},
        {"metric": "emergency_eta", "condition": "emergency ETA normalized", "threshold": "<15min"},
    ],
    "TRAFFIC": [
        {"metric": "congestion_level", "condition": "congestion falls below threshold", "threshold": "<60%"},
        {"metric": "queue_length", "condition": "queue length decreasing", "threshold": "decreasing"},
    ],
    "HOSPITAL": [
        {"metric": "capacity_available", "condition": "capacity restored", "threshold": ">30%"},
        {"metric": "diversion_needed", "condition": "diversion requirement decreases", "threshold": "false"},
    ],
    "TELECOM": [
        {"metric": "telemetry_sources", "condition": "telemetry sources reconnect", "threshold": ">80%"},
        {"metric": "data_confidence", "condition": "confidence improves", "threshold": ">0.7"},
    ],
    "WATER": [
        {"metric": "pressure", "condition": "pressure above minimum", "threshold": ">60%"},
        {"metric": "flow", "condition": "flow stabilized", "threshold": "stable"},
        {"metric": "hospital_reserve", "condition": "hospital reserve not declining", "threshold": "stable"},
    ],
    "FIRE_EMS": [
        {"metric": "response_time", "condition": "response times normalized", "threshold": "<10min"},
        {"metric": "coverage", "condition": "coverage area restored", "threshold": ">90%"},
    ],
}


def generate_coordinated_response(incident, node_states, graph_engine=None):
    """
    Generate a 5-component coordinated action plan for an incident.
    Returns a dict with infrastructure_action, agency_action, emergency_action,
    public_action, and verification_conditions.
    """
    category = incident.get("category", "POWER")
    node_id = incident.get("node_id", "")
    node = node_states.get(node_id, {})
    node_name = node.get("name", node_id)
    priority = incident.get("priority", "P3")

    # Select appropriate infrastructure actions based on severity
    infra_templates = INFRASTRUCTURE_ACTIONS.get(category, INFRASTRUCTURE_ACTIONS["POWER"])
    if priority in ("P1", "P2"):
        infra_actions = infra_templates[:3]  # Use all available actions for critical
    else:
        infra_actions = infra_templates[:1]  # Minimal for lower priority

    # Build infrastructure action
    infrastructure_action = {
        "target": node_name,
        "actions": [
            {
                "description": a["action"],
                "setup_time_minutes": a["setup_min"],
                "required_resources": a["resources"],
                "feasibility": "HIGH" if a["setup_min"] <= 10 else "MEDIUM",
            }
            for a in infra_actions
        ],
    }

    # Agency action
    agency = get_responsible_agency(category)
    agency_action = {
        "primary_agency": agency,
        "actions": [
            f"{agency}: Lead response for {node_name}",
            f"Traffic Control: Coordinate diversions if needed",
        ],
        "coordination_needed": priority in ("P1", "P2"),
    }

    # Emergency action
    emergency_templates = EMERGENCY_ACTIONS.get(category, [])
    emergency_action = {
        "actions": emergency_templates[:3] if priority in ("P1", "P2") else emergency_templates[:1],
        "ems_rerouting_needed": category in ("ROAD", "TRAFFIC"),
    }

    # Public action
    public_templates = PUBLIC_ACTIONS.get(category, [])
    public_action = {
        "advisory_needed": priority in ("P1", "P2", "P3"),
        "actions": public_templates,
        "affected_area": node.get("zone", "Affected Zone"),
        "severity": priority,
    }

    # Verification conditions
    verification = VERIFICATION_CONDITIONS.get(category, [])

    return {
        "id": f"cr-{uuid.uuid4().hex[:8]}",
        "incident_id": incident.get("id", node_id),
        "incident_title": incident.get("title", node_name),
        "priority": priority,
        "category": category,
        "infrastructure_action": infrastructure_action,
        "agency_action": agency_action,
        "emergency_action": emergency_action,
        "public_action": public_action,
        "verification_conditions": verification,
        "status": "PROPOSED",
        "no_action_comparison": _generate_no_action_comparison(incident, node_states),
    }


def _generate_no_action_comparison(incident, node_states):
    """Generate a NO ACTION baseline comparison."""
    node = node_states.get(incident.get("node_id", ""), {})
    population = node.get("population_served", 0)
    downstream_count = len(incident.get("downstream_effects", []))

    return {
        "cascade_depth_no_action": downstream_count + 2,
        "cascade_depth_with_action": max(0, downstream_count - 1),
        "population_at_risk_no_action": population,
        "population_at_risk_with_action": int(population * 0.3),
        "emergency_delay_no_action": 25 + downstream_count * 5,
        "emergency_delay_with_action": 8,
        "recovery_time_no_action": 120 + downstream_count * 30,
        "recovery_time_with_action": 45,
    }


def generate_traffic_actions(affected_node_id, node_states, road_capacities=None):
    """
    Generate possible traffic response actions for a road/traffic failure.
    Each action includes expected benefit, public delay, etc.
    """
    node = node_states.get(affected_node_id, {})
    node_name = node.get("name", affected_node_id)

    actions = [
        {
            "action": "Road Closure",
            "description": f"Full closure of {node_name}",
            "expected_benefit": "Prevents further damage, enables repair",
            "expected_public_delay": "+15 min average",
            "emergency_benefit": "Clears road for repair crews",
            "neighboring_road_impact": "HIGH — all traffic diverted",
            "resource_requirements": {"traffic_teams": 2},
            "setup_time_minutes": 5,
            "feasibility": "HIGH",
            "side_effects": ["Complete traffic diversion to alternates"],
        },
        {
            "action": "Distributed Rerouting",
            "description": f"Split traffic across multiple alternate corridors",
            "expected_benefit": "Reduces congestion on any single alternate",
            "expected_public_delay": "+8 min average",
            "emergency_benefit": "Maintains emergency accessibility",
            "neighboring_road_impact": "MODERATE — spread across routes",
            "resource_requirements": {"traffic_teams": 3},
            "setup_time_minutes": 10,
            "feasibility": "HIGH",
            "side_effects": ["Moderate delay on 3-4 alternate routes"],
        },
        {
            "action": "Emergency Route Prioritization",
            "description": "Dedicate one corridor for emergency vehicles only",
            "expected_benefit": "Guaranteed emergency access",
            "expected_public_delay": "+12 min average",
            "emergency_benefit": "ETA reduced to near-normal",
            "neighboring_road_impact": "HIGH on priority corridor",
            "resource_requirements": {"traffic_teams": 1},
            "setup_time_minutes": 3,
            "feasibility": "HIGH",
            "side_effects": ["Public traffic restricted on priority corridor"],
        },
        {
            "action": "Bus Route Diversion",
            "description": "Divert public transport routes around affected area",
            "expected_benefit": "Maintains public transport service",
            "expected_public_delay": "+10 min for affected routes",
            "emergency_benefit": "Reduces overall congestion",
            "neighboring_road_impact": "LOW — buses use designated stops",
            "resource_requirements": {},
            "setup_time_minutes": 8,
            "feasibility": "MEDIUM",
            "side_effects": ["Some stops temporarily skipped"],
        },
        {
            "action": "Heavy Vehicle Restriction",
            "description": "Restrict heavy/commercial vehicles from affected zone",
            "expected_benefit": "Frees road capacity for essential traffic",
            "expected_public_delay": "+3 min average",
            "emergency_benefit": "Improved throughput",
            "neighboring_road_impact": "LOW",
            "resource_requirements": {"traffic_teams": 1},
            "setup_time_minutes": 5,
            "feasibility": "HIGH",
            "side_effects": ["Commercial deliveries delayed"],
        },
    ]

    return actions


def calculate_distributed_diversion(affected_road_id, alternate_roads, current_capacities=None):
    """
    Calculate traffic distribution across alternate routes based on current capacities.
    Returns allocation map: {road_id: percentage}.
    """
    if not alternate_roads:
        return {}

    # Use capacity-weighted distribution
    total_capacity = 0
    road_caps = {}
    for road in alternate_roads:
        cap = 100  # default capacity
        if current_capacities and road.get("id") in current_capacities:
            cap = current_capacities[road["id"]]
        elif isinstance(road, dict):
            cap = road.get("capacity", 100)

        # Reduce allocation for degraded roads
        status = road.get("status", "OPERATIONAL") if isinstance(road, dict) else "OPERATIONAL"
        if status == "DEGRADED":
            cap = int(cap * 0.6)
        elif status == "FAILED":
            cap = 0

        road_id = road.get("id", road) if isinstance(road, dict) else str(road)
        road_caps[road_id] = max(0, cap)
        total_capacity += max(0, cap)

    if total_capacity == 0:
        # Equal distribution as fallback
        pct = round(100 / len(alternate_roads))
        return {rid: pct for rid in road_caps}

    allocation = {}
    for rid, cap in road_caps.items():
        allocation[rid] = round((cap / total_capacity) * 100)

    return allocation


def allocate_resources(incidents, available_resources):
    """
    Allocate resources across multiple simultaneous incidents.
    P1 incidents get priority, but P2/P3 still receive remaining resources.
    Returns: {incident_id: {resource: count}}
    """
    allocations = {}
    remaining = dict(available_resources)

    # Sort by priority
    priority_order = {"P1": 0, "P2": 1, "P3": 2, "P4": 3}
    sorted_incidents = sorted(incidents, key=lambda i: priority_order.get(i.get("priority", "P4"), 4))

    for inc in sorted_incidents:
        inc_id = inc.get("id", inc.get("node_id", "unknown"))
        category = inc.get("category", "POWER")
        priority = inc.get("priority", "P4")

        # Determine resource needs based on category and priority
        needs = _estimate_resource_needs(category, priority)
        allocated = {}

        for resource, needed in needs.items():
            avail = remaining.get(resource, 0)
            give = min(needed, avail)
            if give > 0:
                allocated[resource] = give
                remaining[resource] = avail - give

        allocations[inc_id] = {
            "allocated": allocated,
            "requested": needs,
            "fully_satisfied": all(allocated.get(r, 0) >= n for r, n in needs.items()),
        }

    return allocations, remaining


def _estimate_resource_needs(category, priority):
    """Estimate resource needs for an incident category and priority."""
    base_needs = {
        "POWER": {"generators": 1, "repair_crews": 1},
        "ROAD": {"traffic_teams": 2, "drainage_teams": 1},
        "TRAFFIC": {"traffic_teams": 2},
        "HOSPITAL": {"generators": 1},
        "TELECOM": {"repair_crews": 1},
        "WATER": {"repair_crews": 1, "tankers": 2},
        "FIRE_EMS": {"traffic_teams": 1},
    }

    needs = dict(base_needs.get(category, {}))

    # P1 gets more resources
    if priority == "P1":
        for k in needs:
            needs[k] = min(needs[k] + 1, needs[k] * 2)

    return needs


def check_response_effectiveness(action_tickets, sim_state):
    """
    Check if actions are producing expected improvements.
    Returns list of verification results.
    """
    results = []
    nodes = sim_state.get("nodes", {})

    for ticket in action_tickets:
        if ticket.get("status") not in ("IN_PROGRESS", "COMPLETED"):
            continue

        conditions = ticket.get("verification_condition", [])
        target = ticket.get("target_asset_id", "")
        node = nodes.get(target, {})

        passed = 0
        total = len(conditions) if conditions else 1

        for cond in (conditions or []):
            metric = cond.get("metric", "")
            if metric == "road_throughput":
                # Check if node is improving
                if node.get("status") in ("OPERATIONAL", "RECOVERING"):
                    passed += 1
            elif metric == "downstream_nodes_powered":
                if node.get("status") in ("OPERATIONAL", "RECOVERING"):
                    passed += 1
            elif metric == "pressure" or metric == "flow":
                if node.get("status") in ("OPERATIONAL", "RECOVERING"):
                    passed += 1
            elif metric == "telemetry_sources" or metric == "data_confidence":
                if node.get("status") != "UNKNOWN":
                    passed += 1
            else:
                # Generic: improving if status is better than FAILED
                if node.get("status") not in ("FAILED",):
                    passed += 1

        verified = passed >= total * 0.7  # 70% conditions met
        results.append({
            "ticket_id": ticket.get("id", ""),
            "target": target,
            "conditions_met": passed,
            "conditions_total": total,
            "verified": verified,
            "recommendation": "STABILIZING" if verified else "REASSESS",
        })

    return results
