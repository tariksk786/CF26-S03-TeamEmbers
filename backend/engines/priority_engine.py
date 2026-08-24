"""
LIFEGRID Priority Intelligence Engine
Evaluates, ranks, and dynamically reassesses incident priorities.
"""

# ─── Service-Specific State Mappings ───────────────────────────────────────────
SERVICE_STATES = {
    "POWER": {
        "OPERATIONAL": "OPERATIONAL",
        "DEGRADED": "DEGRADED",
        "FAILED": "FAILED",
        "RECOVERING": "RECOVERING",
    },
    "ROAD": {
        "OPERATIONAL": "OPEN",
        "DEGRADED": "DEGRADED",
        "FAILED": "BLOCKED",
        "RECOVERING": "PARTIALLY_OPEN",
    },
    "TRAFFIC": {
        "OPERATIONAL": "NORMAL",
        "DEGRADED": "CONGESTED",
        "FAILED": "CRITICAL",
        "RECOVERING": "STABILIZING",
    },
    "HOSPITAL": {
        "OPERATIONAL": "NORMAL",
        "DEGRADED": "CAPACITY_CONSTRAINED",
        "FAILED": "CAPACITY_CONSTRAINED",
        "RECOVERING": "RECOVERING",
        "PREDICTED_RISK": "DEGRADED",
    },
    "TELECOM": {
        "OPERATIONAL": "CONNECTED",
        "DEGRADED": "DEGRADED",
        "FAILED": "PARTIAL_OUTAGE",
        "RECOVERING": "RESTORING",
        "UNKNOWN": "UNKNOWN",
    },
    "WATER": {
        "OPERATIONAL": "NORMAL",
        "DEGRADED": "LOW_PRESSURE",
        "FAILED": "OUTAGE",
        "RECOVERING": "RESTORING",
    },
    "FIRE_EMS": {
        "OPERATIONAL": "AVAILABLE",
        "DEGRADED": "RESOURCE_CONSTRAINED",
        "FAILED": "CRITICAL_SHORTAGE",
        "RECOVERING": "RECOVERING",
    },
}

# Map node types from data to canonical categories
TYPE_CATEGORY_MAP = {
    "power": "POWER",
    "traffic": "TRAFFIC",
    "hospital": "HOSPITAL",
    "telecom": "TELECOM",
    "water": "WATER",
    "fire_station": "FIRE_EMS",
    "ambulance_station": "FIRE_EMS",
    "emergency_route": "ROAD",
    "bridge": "ROAD",
    "shelter": "HOSPITAL",
}

# Agency responsibility categories
AGENCY_CATEGORIES = {
    "POWER": "Power Utility",
    "ROAD": "Municipal Road/Drainage",
    "TRAFFIC": "Traffic Control",
    "HOSPITAL": "Hospital/Health Operations",
    "TELECOM": "Telecom Operations",
    "WATER": "Water Utility",
    "FIRE_EMS": "EMS / Fire Service",
}

CRITICAL_TYPES = {"hospital", "water", "fire_station", "ambulance_station", "telecom"}


def get_service_state(node_type, generic_status):
    """Map generic status to domain-specific service state label."""
    category = TYPE_CATEGORY_MAP.get(node_type, "POWER")
    mapping = SERVICE_STATES.get(category, SERVICE_STATES["POWER"])
    return mapping.get(generic_status, generic_status)


def get_category(node_type):
    return TYPE_CATEGORY_MAP.get(node_type, "POWER")


def get_responsible_agency(category):
    return AGENCY_CATEGORIES.get(category, "Municipal Operations")


def assess_incident(node_id, node_states, graph_engine):
    """
    Evaluate a single failed/degraded node and produce incident assessment dict.
    Returns None if the node does not warrant an incident.
    """
    node = node_states.get(node_id)
    if not node:
        return None

    status = node.get("status", "OPERATIONAL")
    if status in ("OPERATIONAL", "RECOVERING"):
        return None

    node_type = node.get("type", "power")
    category = get_category(node_type)
    criticality = node.get("criticality", 50)
    population = node.get("population_served", 0)
    backup = node.get("backup_available", False)
    backup_rem = node.get("backup_remaining_minutes", 0)

    # ─── Scoring Components ────────────────────────────────────────────────
    # Life-Safety Impact (0-100)
    life_safety = 0
    if node_type in CRITICAL_TYPES:
        life_safety += 40
    if status == "FAILED":
        life_safety += 30
    elif status == "DEGRADED":
        life_safety += 15
    life_safety += min(30, population / 5000)
    life_safety = min(100, life_safety)

    # Cascade Growth Risk — how many downstream nodes exist
    downstream = graph_engine.get_downstream_nodes(node_id) if hasattr(graph_engine, 'get_downstream_nodes') else []
    downstream_at_risk = [d for d in downstream if node_states.get(d, {}).get("status") in ("OPERATIONAL", "DEGRADED")]
    cascade_risk = min(100, len(downstream_at_risk) * 15)

    # Time to Critical
    if status == "FAILED" and not backup:
        time_to_critical = 5
    elif status == "FAILED" and backup:
        time_to_critical = max(5, backup_rem)
    elif status == "DEGRADED":
        time_to_critical = 30
    else:
        time_to_critical = 60

    # Data Confidence
    confidence = node.get("data_confidence", 1.0)
    if isinstance(confidence, (int, float)) and confidence > 1:
        confidence = confidence / 100.0  # Normalize to 0-1

    # Recovery Leverage — how many downstream risks fixed by restoring this node
    recovery_leverage = len(downstream_at_risk)

    # Emergency Accessibility Impact
    emergency_access_impact = 0
    if node_type in ("emergency_route", "traffic"):
        emergency_access_impact = 60
    if node_type == "hospital":
        emergency_access_impact = 80

    # ─── Priority Score ────────────────────────────────────────────────────
    # Weighted composite (documented deterministic weights)
    score = (
        life_safety * 0.25 +
        cascade_risk * 0.15 +
        emergency_access_impact * 0.15 +
        (100 - time_to_critical) * 0.15 +
        criticality * 0.10 +
        recovery_leverage * 5 * 0.10 +
        (1 - confidence) * 50 * 0.05 +
        min(100, population / 1000) * 0.05
    )

    # Priority classification
    if score >= 65 or (status == "FAILED" and node_type in CRITICAL_TYPES):
        priority = "P1"
    elif score >= 45:
        priority = "P2"
    elif score >= 25:
        priority = "P3"
    else:
        priority = "P4"

    # Why explanation
    why_parts = []
    if life_safety >= 40:
        why_parts.append(f"Critical facility at risk (life-safety={life_safety:.0f})")
    if cascade_risk >= 30:
        why_parts.append(f"{len(downstream_at_risk)} downstream services at risk")
    if time_to_critical <= 15:
        why_parts.append(f"Time to critical: {time_to_critical} min")
    if emergency_access_impact >= 40:
        why_parts.append("Emergency accessibility affected")
    if recovery_leverage >= 3:
        why_parts.append(f"Recovery leverage: fixing this resolves {recovery_leverage} downstream risks")

    return {
        "node_id": node_id,
        "title": f"{node.get('name', node_id)} — {get_service_state(node_type, status)}",
        "category": category,
        "priority": priority,
        "score": round(score, 1),
        "status": "UNASSIGNED",
        "life_safety_impact": round(life_safety, 1),
        "population_affected": population,
        "cascade_growth_risk": round(cascade_risk, 1),
        "time_to_critical_minutes": time_to_critical,
        "data_confidence": round(confidence, 2),
        "recovery_leverage": recovery_leverage,
        "emergency_access_impact": round(emergency_access_impact, 1),
        "downstream_effects": downstream_at_risk[:10],  # Cap for display
        "why_priority": " | ".join(why_parts) if why_parts else f"Score {score:.0f} based on weighted assessment",
        "service_state": get_service_state(node_type, status),
        "responsible_agency": get_responsible_agency(category),
    }


def rank_incidents(incidents):
    """Sort incidents by priority then by score descending."""
    priority_order = {"P1": 0, "P2": 1, "P3": 2, "P4": 3}
    return sorted(
        incidents,
        key=lambda i: (priority_order.get(i["priority"], 4), -i.get("score", 0))
    )


def calculate_recovery_leverage(node_id, graph_engine, node_states):
    """How many downstream risks can be reduced by fixing one upstream problem."""
    downstream = graph_engine.get_downstream_nodes(node_id) if hasattr(graph_engine, 'get_downstream_nodes') else []
    at_risk = [d for d in downstream if node_states.get(d, {}).get("status") in ("DEGRADED", "FAILED", "PREDICTED_RISK")]
    return len(at_risk)


def group_by_root_cause(incidents, node_states, graph_engine):
    """
    Group incidents so downstream effects of a root cause are children.
    Returns list of root incidents with 'downstream_incidents' field.
    """
    root_ids = set()
    child_map = {}  # child_node_id -> root_node_id

    # Sort by score descending to find highest-impact nodes first
    sorted_inc = sorted(incidents, key=lambda i: -i.get("score", 0))

    for inc in sorted_inc:
        nid = inc["node_id"]
        # Check if this node is downstream of any existing root
        is_child = False
        for root_nid in list(root_ids):
            downstream = graph_engine.get_downstream_nodes(root_nid) if hasattr(graph_engine, 'get_downstream_nodes') else []
            if nid in downstream:
                child_map[nid] = root_nid
                is_child = True
                break
        if not is_child:
            root_ids.add(nid)

    # Build grouped structure
    roots = []
    for inc in sorted_inc:
        if inc["node_id"] in root_ids:
            inc["downstream_incidents"] = [
                i for i in sorted_inc
                if child_map.get(i["node_id"]) == inc["node_id"]
            ]
            inc["is_root"] = True
            roots.append(inc)

    return roots


def reassess_priorities(incidents, node_states, graph_engine):
    """
    Re-evaluate priorities for all incidents based on current state.
    Returns (updated_incidents, changes) where changes is a list of priority transitions.
    """
    changes = []
    updated = []

    for inc in incidents:
        nid = inc["node_id"]
        new_assessment = assess_incident(nid, node_states, graph_engine)
        if new_assessment is None:
            # Node has recovered
            if inc.get("status") not in ("RESOLVED", "MONITORING"):
                changes.append({
                    "incident_id": inc.get("id", nid),
                    "old_priority": inc["priority"],
                    "new_priority": "RESOLVED",
                    "reason": "Node has recovered"
                })
                inc["status"] = "RESOLVED"
                inc["priority"] = "P4"
            updated.append(inc)
            continue

        old_priority = inc["priority"]
        new_priority = new_assessment["priority"]

        if old_priority != new_priority:
            changes.append({
                "incident_id": inc.get("id", nid),
                "old_priority": old_priority,
                "new_priority": new_priority,
                "reason": new_assessment["why_priority"]
            })

        # Update fields
        inc["priority"] = new_priority
        inc["score"] = new_assessment["score"]
        inc["life_safety_impact"] = new_assessment["life_safety_impact"]
        inc["cascade_growth_risk"] = new_assessment["cascade_growth_risk"]
        inc["time_to_critical_minutes"] = new_assessment["time_to_critical_minutes"]
        inc["data_confidence"] = new_assessment["data_confidence"]
        inc["recovery_leverage"] = new_assessment["recovery_leverage"]
        inc["why_priority"] = new_assessment["why_priority"]
        inc["service_state"] = new_assessment["service_state"]

        updated.append(inc)

    return rank_incidents(updated), changes
