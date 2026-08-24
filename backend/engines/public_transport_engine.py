"""
LIFEGRID Public Transport Engine
Evaluates bus route impact from road/infrastructure disruptions.
"""


def evaluate_bus_impact(affected_road_ids, bus_routes):
    """
    Determine which bus routes are affected by road closures/degradation.
    affected_road_ids: set of road IDs that are blocked/degraded
    bus_routes: list of {id, name, route_number, road_segments, key_stops, status}
    Returns list of affected route assessments.
    """
    affected = []

    for route in bus_routes:
        segments = route.get("road_segments", [])
        affected_segments = [s for s in segments if s in affected_road_ids]

        if not affected_segments:
            continue

        total_segments = len(segments)
        affected_pct = (len(affected_segments) / total_segments * 100) if total_segments > 0 else 0

        # Determine status
        if affected_pct > 50:
            new_status = "SUSPENDED"
            delay = 0  # Can't operate
            diversion = "Route suspended — use alternate services"
        elif affected_pct > 20:
            new_status = "PARTIALLY_SUSPENDED"
            delay = 15
            diversion = f"Route partially suspended — {len(affected_segments)} section(s) skipped"
        else:
            new_status = "DIVERTED"
            delay = 8
            diversion = f"Route diverted around affected section(s)"

        affected.append({
            "route_id": route.get("id", ""),
            "route_name": route.get("name", ""),
            "route_number": route.get("route_number", ""),
            "status": new_status,
            "affected_segments": affected_segments,
            "affected_percentage": round(affected_pct, 1),
            "delay_minutes": delay,
            "diversion_info": diversion,
            "skipped_stops": _estimate_skipped_stops(route, affected_segments),
        })

    return affected


def _estimate_skipped_stops(route, affected_segments):
    """Estimate which stops might be skipped due to affected segments."""
    key_stops = route.get("key_stops", [])
    # Simple heuristic: if a segment is near a stop, that stop may be skipped
    skipped = []
    for stop in key_stops:
        stop_segment = stop.get("nearest_segment")
        if stop_segment and stop_segment in affected_segments:
            skipped.append(stop.get("name", stop.get("id", "Unknown Stop")))
    return skipped


def generate_bus_advisory(affected_routes):
    """
    Generate public-facing bus route advisory text.
    """
    if not affected_routes:
        return None

    lines = ["PUBLIC TRANSPORT NOTICE", ""]

    for route in affected_routes:
        status_text = {
            "SUSPENDED": "⛔ SUSPENDED",
            "PARTIALLY_SUSPENDED": "⚠️ PARTIAL SERVICE",
            "DIVERTED": "↩️ DIVERTED",
        }.get(route["status"], route["status"])

        lines.append(f"Route {route.get('route_number', route['route_name'])}: {status_text}")
        lines.append(f"  {route['diversion_info']}")

        if route.get("delay_minutes"):
            lines.append(f"  Expected delay: +{route['delay_minutes']} minutes")

        if route.get("skipped_stops"):
            lines.append(f"  Skipped stops: {', '.join(route['skipped_stops'])}")

        lines.append("")

    lines.append("SIMULATED PROTOTYPE — For demonstration purposes only")

    return "\n".join(lines)
