"""
LIFEGRID Public Advisory Engine
Generates citizen-facing advisories with public-friendly language,
determines scope, and manages notification philosophy.
"""
import uuid
from datetime import datetime


# ─── Technical to Public Language Translation ──────────────────────────────────

TRANSLATIONS = {
    "FAILED": "currently unavailable",
    "DEGRADED": "experiencing reduced service",
    "PREDICTED_RISK": "may experience disruption soon",
    "BLOCKED": "temporarily closed",
    "CONGESTED": "experiencing heavy congestion",
    "CRITICAL": "severely disrupted",
    "LOW_PRESSURE": "experiencing low water pressure",
    "OUTAGE": "currently interrupted",
    "PARTIAL_OUTAGE": "experiencing intermittent service",
    "CAPACITY_CONSTRAINED": "operating at limited capacity",
    "RESOURCE_CONSTRAINED": "operating with limited resources",
}


def translate_to_public(technical_term):
    """Convert technical status to citizen-friendly language."""
    return TRANSLATIONS.get(technical_term, technical_term.lower().replace("_", " "))


def translate_metric_to_public(metric_name, value):
    """Convert technical metric to citizen-friendly statement."""
    translations = {
        "dependency_strength": f"This service relies on an upstream infrastructure system",
        "emergency_accessibility": _accessibility_text(value),
        "cascade_depth": f"Multiple connected services are affected",
        "data_confidence": f"Information may be partially estimated" if value < 70 else "Based on current available data",
        "population_served": f"Approximately {value:,} residents in the affected area" if isinstance(value, int) else str(value),
    }
    return translations.get(metric_name, f"{metric_name}: {value}")


def _accessibility_text(value):
    if isinstance(value, (int, float)):
        if value < 30:
            return "Travel to nearby emergency facilities may take significantly longer than usual"
        elif value < 60:
            return "Travel to nearby emergency facilities may take longer than usual"
        else:
            return "Emergency facility access is currently near normal"
    return "Emergency accessibility information is being assessed"


# ─── Advisory Generation ──────────────────────────────────────────────────────

ADVISORY_TEMPLATES = {
    "ROAD": {
        "what_happened": "{name} temporarily {status_text} due to {cause}",
        "what_to_avoid": "Avoid {name} and surrounding approaches",
        "alternative": "Use currently recommended alternate corridors",
    },
    "WATER": {
        "what_happened": "Reduced water supply in {zone}",
        "what_to_avoid": "Conserve water; non-essential usage should be minimized",
        "alternative": "Emergency tanker supply is being arranged if needed",
    },
    "POWER": {
        "what_happened": "Power supply disruption affecting {zone}",
        "what_to_avoid": "Be cautious at traffic signals — some may be non-functional",
        "alternative": "Backup systems are active where available",
    },
    "TRAFFIC": {
        "what_happened": "Traffic signal disruption at {name}",
        "what_to_avoid": "Expect delays near {name} and surrounding junctions",
        "alternative": "Follow traffic officer guidance at affected intersections",
    },
    "TELECOM": {
        "what_happened": "Communication services partially disrupted in {zone}",
        "what_to_avoid": "Some services may be intermittent",
        "alternative": "Use alternate communication methods if needed",
    },
    "HOSPITAL": {
        "what_happened": "{name} operating at reduced capacity",
        "what_to_avoid": "Non-emergency visits may experience delays",
        "alternative": "Consider alternate facilities for non-urgent needs",
    },
    "FIRE_EMS": {
        "what_happened": "Emergency response times may be extended in {zone}",
        "what_to_avoid": "Call emergency services only for genuine emergencies",
        "alternative": "Additional units are being mobilized",
    },
}


def generate_advisory(incident, response=None, current_time_label=""):
    """
    Generate a citizen-facing public advisory from an incident.
    """
    category = incident.get("category", "ROAD")
    node_name = incident.get("title", "").split("—")[0].strip()
    zone = "the affected area"  # Safe default
    status = incident.get("service_state", "disrupted")
    status_text = translate_to_public(status)
    priority = incident.get("priority", "P3")

    # Don't generate advisory for P4 incidents (routine/monitoring)
    if priority == "P4":
        return None

    template = ADVISORY_TEMPLATES.get(category, ADVISORY_TEMPLATES["ROAD"])

    cause = "operational conditions"
    if incident.get("why_priority"):
        # Extract simple cause from why text
        why = incident["why_priority"]
        if "downstream" in why.lower():
            cause = "connected infrastructure disruption"
        elif "life-safety" in why.lower():
            cause = "service disruption"
        elif "accessibility" in why.lower():
            cause = "access disruption"

    what_happened = template["what_happened"].format(
        name=node_name, zone=zone, status_text=status_text, cause=cause
    )
    what_to_avoid = template["what_to_avoid"].format(name=node_name, zone=zone)
    alternative = template["alternative"].format(name=node_name, zone=zone)

    # Add bus route info if available
    bus_info = ""
    if response and response.get("public_action", {}).get("bus_routes_affected"):
        routes = response["public_action"]["bus_routes_affected"]
        bus_info = f"Public Transport: Routes {', '.join(routes)} temporarily diverted"

    # Estimated duration based on priority
    if priority == "P1":
        estimated_duration = "Duration uncertain — updates every 15 minutes"
    elif priority == "P2":
        estimated_duration = "Expected duration: 1-2 hours"
    else:
        estimated_duration = "Expected duration: under 1 hour"

    # Next update
    next_update = "Next update in 15 minutes" if priority in ("P1", "P2") else "Next update in 30 minutes"

    return {
        "id": f"adv-{uuid.uuid4().hex[:8]}",
        "incident_id": incident.get("id", ""),
        "advisory_type": category,
        "severity": priority,
        "affected_area": zone,
        "what_happened": what_happened,
        "what_to_avoid": what_to_avoid,
        "alternative": alternative + (f"\n{bus_info}" if bus_info else ""),
        "estimated_duration": estimated_duration,
        "next_update_time": next_update,
        "status": "DRAFT",
        "is_simulated": True,
        "simulated_label": "SIMULATED PROTOTYPE ADVISORY",
        "created_at": current_time_label or datetime.utcnow().isoformat(),
    }


def determine_advisory_scope(incident):
    """
    Determine who should receive this advisory and through what channels.
    Based on: geographic relevance, severity, affected service, actionability.
    """
    priority = incident.get("priority", "P4")
    category = incident.get("category", "ROAD")

    if priority == "P4":
        return {"should_notify": False, "reason": "Low priority — no public action needed"}

    channels = []
    geographic_scope = "zone"

    if priority == "P1":
        channels = [
            "Geo-targeted SMS / CAP alert",
            "Municipal website/app",
            "Browser notification",
            "Variable Message Sign",
            "Public-transport display",
            "Emergency helpline/IVR",
        ]
        geographic_scope = "affected zone + adjacent zones"
    elif priority == "P2":
        channels = [
            "Municipal website/app",
            "Variable Message Sign",
            "Public-transport display",
        ]
        geographic_scope = "affected zone"
    else:  # P3
        channels = [
            "Municipal website/app",
        ]
        geographic_scope = "local area only"

    # Category-specific channels
    if category == "ROAD":
        channels.append("Variable Message Sign")
    if category == "WATER":
        channels.append("Geo-targeted SMS / CAP alert")

    return {
        "should_notify": True,
        "channels": list(set(channels)),
        "geographic_scope": geographic_scope,
        "severity": priority,
        "actionable": priority in ("P1", "P2", "P3"),
    }


# ─── Multi-Channel Communication Model (Conceptual) ──────────────────────────

COMMUNICATION_CHANNELS = [
    {"channel": "Geo-targeted SMS / CAP alert", "type": "push", "coverage": "broad", "latency": "minutes"},
    {"channel": "Municipal website/app", "type": "pull", "coverage": "broad", "latency": "real-time"},
    {"channel": "Browser notification", "type": "push", "coverage": "subscribers", "latency": "real-time"},
    {"channel": "Variable Message Sign", "type": "display", "coverage": "road users", "latency": "minutes"},
    {"channel": "Public-transport display", "type": "display", "coverage": "transit users", "latency": "minutes"},
    {"channel": "Official communication channel", "type": "broadcast", "coverage": "broad", "latency": "minutes"},
    {"channel": "Emergency helpline/IVR", "type": "interactive", "coverage": "callers", "latency": "real-time"},
    {"channel": "Machine-readable partner feed", "type": "api", "coverage": "partners", "latency": "real-time"},
]
