"""
LIFEGRID Action Ticket Service
Manages the lifecycle of action tickets from GENERATED through VERIFIED.
"""
import uuid
from datetime import datetime


def create_ticket(incident, action, department, simulation_id=""):
    """
    Create an action ticket from an incident and a response action.
    """
    return {
        "id": f"TKT-{uuid.uuid4().hex[:8].upper()}",
        "incident_id": incident.get("id", ""),
        "simulation_id": simulation_id,
        "priority": incident.get("priority", "P3"),
        "responsible_department": department,
        "action_description": action.get("description", action.get("action", "")),
        "target_asset_id": incident.get("node_id", ""),
        "target_asset_name": incident.get("title", ""),
        "required_resources": action.get("resources", action.get("required_resources", {})),
        "expected_setup_minutes": action.get("setup_time_minutes", action.get("setup_min", 10)),
        "status": "GENERATED",
        "verification_condition": action.get("verification_conditions", []),
        "created_at": datetime.utcnow().isoformat(),
        "acknowledged_at": None,
        "completed_at": None,
        "outcome": None,
    }


def acknowledge_ticket(ticket):
    """Mark a ticket as acknowledged."""
    ticket["status"] = "ACKNOWLEDGED"
    ticket["acknowledged_at"] = datetime.utcnow().isoformat()
    return ticket


def start_ticket(ticket):
    """Mark a ticket as in-progress."""
    ticket["status"] = "IN_PROGRESS"
    return ticket


def complete_ticket(ticket, outcome="Action completed"):
    """Mark a ticket as completed."""
    ticket["status"] = "COMPLETED"
    ticket["completed_at"] = datetime.utcnow().isoformat()
    ticket["outcome"] = outcome
    return ticket


def verify_ticket(ticket, verified=True):
    """Mark a ticket as verified or failed."""
    if verified:
        ticket["status"] = "VERIFIED"
        ticket["outcome"] = (ticket.get("outcome", "") + " — VERIFIED").strip(" —")
    else:
        ticket["status"] = "FAILED"
        ticket["outcome"] = (ticket.get("outcome", "") + " — REASSESS NEEDED").strip(" —")
    return ticket


def reassess_ticket(ticket, new_action_description=""):
    """
    Create a new ticket when verification fails.
    Links back to the original incident.
    """
    new_ticket = {
        "id": f"TKT-{uuid.uuid4().hex[:8].upper()}",
        "incident_id": ticket.get("incident_id", ""),
        "simulation_id": ticket.get("simulation_id", ""),
        "priority": ticket.get("priority", "P3"),
        "responsible_department": ticket.get("responsible_department", ""),
        "action_description": new_action_description or f"REASSESSED: {ticket.get('action_description', '')}",
        "target_asset_id": ticket.get("target_asset_id", ""),
        "target_asset_name": ticket.get("target_asset_name", ""),
        "required_resources": ticket.get("required_resources", {}),
        "expected_setup_minutes": ticket.get("expected_setup_minutes", 10),
        "status": "GENERATED",
        "verification_condition": ticket.get("verification_condition", []),
        "created_at": datetime.utcnow().isoformat(),
        "acknowledged_at": None,
        "completed_at": None,
        "outcome": None,
        "replaces_ticket_id": ticket.get("id", ""),
    }
    return new_ticket


def generate_tickets_from_response(incident, coordinated_response, simulation_id=""):
    """
    Generate action tickets from a coordinated response plan.
    Creates one ticket per infrastructure action + one for each emergency action.
    """
    tickets = []

    # Infrastructure action tickets
    infra = coordinated_response.get("infrastructure_action", {})
    agency = coordinated_response.get("agency_action", {})
    primary_dept = agency.get("primary_agency", "Municipal Operations")

    for action in infra.get("actions", []):
        tickets.append(create_ticket(incident, action, primary_dept, simulation_id))

    # Emergency action tickets
    emergency = coordinated_response.get("emergency_action", {})
    for action_desc in emergency.get("actions", []):
        action = {"description": action_desc, "setup_time_minutes": 5, "resources": {}}
        tickets.append(create_ticket(incident, action, "EMS / Fire Service", simulation_id))

    return tickets
