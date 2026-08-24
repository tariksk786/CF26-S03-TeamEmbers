"""
LIFEGRID Recovery Verification Engine
Defines success conditions, verifies them, and triggers reassessment
when expected improvements do not occur (closed-loop response).
"""


def define_success_conditions(category, node_states, node_id):
    """
    Define domain-specific success conditions for verifying an intervention worked.
    Returns list of condition dicts.
    """
    conditions = {
        "POWER": [
            {"metric": "node_status", "target": "OPERATIONAL", "label": "Downstream nodes receive stable power", "weight": 0.4},
            {"metric": "backup_stable", "target": True, "label": "Backups stop draining", "weight": 0.3},
            {"metric": "cascade_halted", "target": True, "label": "No new downstream failures", "weight": 0.3},
        ],
        "ROAD": [
            {"metric": "throughput", "target": 70, "label": "Road throughput above 70%", "weight": 0.3},
            {"metric": "water_level_safe", "target": True, "label": "Water level below safe threshold", "weight": 0.2},
            {"metric": "avg_speed_improving", "target": True, "label": "Average travel speed improving", "weight": 0.2},
            {"metric": "emergency_eta_normal", "target": True, "label": "Emergency ETA normalized", "weight": 0.3},
        ],
        "TRAFFIC": [
            {"metric": "congestion_below", "target": 60, "label": "Congestion falls below 60%", "weight": 0.4},
            {"metric": "queue_decreasing", "target": True, "label": "Queue length decreasing", "weight": 0.3},
            {"metric": "signal_operational", "target": True, "label": "Signal timing restored", "weight": 0.3},
        ],
        "HOSPITAL": [
            {"metric": "capacity_restored", "target": 30, "label": "Available capacity above 30%", "weight": 0.4},
            {"metric": "diversion_reduced", "target": True, "label": "Diversion requirement decreases", "weight": 0.3},
            {"metric": "access_restored", "target": True, "label": "Access routes operational", "weight": 0.3},
        ],
        "TELECOM": [
            {"metric": "telemetry_reconnected", "target": 80, "label": "Telemetry sources reconnect (>80%)", "weight": 0.4},
            {"metric": "confidence_improved", "target": 0.7, "label": "Data confidence above 0.7", "weight": 0.3},
            {"metric": "comm_restored", "target": True, "label": "Communication services restored", "weight": 0.3},
        ],
        "WATER": [
            {"metric": "pressure_above_min", "target": 60, "label": "Pressure above 60%", "weight": 0.3},
            {"metric": "flow_stable", "target": True, "label": "Flow stabilized", "weight": 0.3},
            {"metric": "hospital_reserve_stable", "target": True, "label": "Hospital reserve not declining", "weight": 0.4},
        ],
        "FIRE_EMS": [
            {"metric": "response_time_normal", "target": 10, "label": "Response times under 10 min", "weight": 0.5},
            {"metric": "coverage_restored", "target": 90, "label": "Coverage area above 90%", "weight": 0.5},
        ],
    }

    return conditions.get(category, conditions["POWER"])


def verify_conditions(conditions, node_states, node_id, sim_state=None):
    """
    Verify if success conditions are met for a given node.
    Returns (passed, total, details, overall_pass).
    """
    node = node_states.get(node_id, {})
    status = node.get("status", "FAILED")
    details = []
    total_weight = 0
    passed_weight = 0

    for cond in conditions:
        metric = cond.get("metric", "")
        target = cond.get("target")
        weight = cond.get("weight", 1.0)
        total_weight += weight
        met = False

        if metric == "node_status":
            met = status in ("OPERATIONAL", "RECOVERING")
        elif metric == "backup_stable":
            met = status != "FAILED"
        elif metric == "cascade_halted":
            met = status not in ("FAILED",)
        elif metric == "throughput":
            # Use capacity as proxy for throughput
            cap = node.get("capacity", 0)
            load = node.get("current_load", 100)
            throughput = max(0, cap - load) if cap > 0 else 0
            met = throughput >= target or status in ("OPERATIONAL", "RECOVERING")
        elif metric in ("congestion_below", "pressure_above_min", "capacity_restored"):
            met = status in ("OPERATIONAL", "RECOVERING", "DEGRADED")
        elif metric in ("water_level_safe", "avg_speed_improving", "queue_decreasing",
                        "signal_operational", "diversion_reduced", "access_restored",
                        "flow_stable", "hospital_reserve_stable", "comm_restored"):
            met = status in ("OPERATIONAL", "RECOVERING")
        elif metric == "telemetry_reconnected":
            met = status != "UNKNOWN"
        elif metric == "confidence_improved":
            conf = node.get("data_confidence", 0)
            if isinstance(conf, (int, float)) and conf > 1:
                conf = conf / 100.0
            met = conf >= target
        elif metric in ("response_time_normal", "coverage_restored"):
            met = status in ("OPERATIONAL", "RECOVERING")
        elif metric == "emergency_eta_normal":
            met = status in ("OPERATIONAL", "RECOVERING")
        else:
            met = status in ("OPERATIONAL", "RECOVERING")

        if met:
            passed_weight += weight

        details.append({
            "metric": metric,
            "label": cond.get("label", metric),
            "target": target,
            "met": met,
            "weight": weight,
        })

    overall_pass = (passed_weight / total_weight) >= 0.7 if total_weight > 0 else False

    return {
        "node_id": node_id,
        "conditions": details,
        "passed_weight": round(passed_weight, 2),
        "total_weight": round(total_weight, 2),
        "pass_rate": round(passed_weight / total_weight, 2) if total_weight > 0 else 0,
        "overall_pass": overall_pass,
        "recommendation": "STABILIZING" if overall_pass else "REASSESS",
    }


def closed_loop_check(sim_state, active_tickets, graph_engine=None):
    """
    Run closed-loop verification across all active tickets.
    Returns list of tickets that need reassessment.
    """
    nodes = sim_state.get("nodes", {})
    reassess_needed = []

    for ticket in active_tickets:
        if ticket.get("status") not in ("IN_PROGRESS", "COMPLETED"):
            continue

        target = ticket.get("target_asset_id", "")
        if not target or target not in nodes:
            continue

        # Get category from node type
        node = nodes.get(target, {})
        node_type = node.get("type", "power")
        from backend.engines.priority_engine import get_category
        category = get_category(node_type)

        conditions = define_success_conditions(category, nodes, target)
        result = verify_conditions(conditions, nodes, target, sim_state)

        if not result["overall_pass"]:
            reassess_needed.append({
                "ticket_id": ticket.get("id", ""),
                "target": target,
                "node_name": node.get("name", target),
                "verification_result": result,
                "reason": f"Expected improvement not observed — {result['pass_rate']:.0%} conditions met",
                "recommendation": "Generate revised recommendation",
            })

    return reassess_needed
