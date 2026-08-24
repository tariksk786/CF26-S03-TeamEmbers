import os
import sys
import json
import copy
import uuid
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query, Response, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Ensure the project root is on sys.path so backend.* imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.database import get_db, Base, engine
from backend.models import (
    CityZone, Scenario, Simulation, SimulationEvent,
    InfrastructureNode, RoadNode, RoadEdge, DependencyEdge,
    Resource, EmergencyVehicle, AuditEvent,
    Intervention, InterventionResult
)
from backend.engines.graph_engine import GraphEngine
from backend.engines.road_engine import RoadEngine
from backend.engines.cascade_engine import CascadeEngine
from backend.engines.impact_engine import ImpactEngine
from backend.engines.accessibility_engine import AccessibilityEngine
from backend.engines.intervention_engine import InterventionEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lifegrid")

app = FastAPI(title="LIFEGRID Backend", version="1.0.0")

# CORS — allow all origins during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── WebSocket Connection Manager ─────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, ws: WebSocket, sim_id: str):
        await ws.accept()
        self.active.setdefault(sim_id, []).append(ws)

    def disconnect(self, ws: WebSocket, sim_id: str):
        if sim_id in self.active:
            self.active[sim_id] = [c for c in self.active[sim_id] if c is not ws]

    async def broadcast(self, sim_id: str, msg: dict):
        for ws in self.active.get(sim_id, []):
            try:
                await ws.send_json(msg)
            except Exception:
                pass

manager = ConnectionManager()

# ─── Global Engines ────────────────────────────────────────────────────────────
graph_engine = GraphEngine()
road_engine = RoadEngine()
cascade_engine = CascadeEngine(graph_engine)
impact_engine = ImpactEngine(graph_engine, road_engine)
accessibility_engine = AccessibilityEngine(road_engine)

# In-memory simulation states  {sim_id -> dict}
sim_states: Dict[str, dict] = {}

# ─── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info("LIFEGRID backend starting …")
    db = next(get_db())
    try:
        infra = db.query(InfrastructureNode).all()
        deps  = db.query(DependencyEdge).all()
        graph_engine.load_dependencies(infra, deps)
        logger.info(f"Infrastructure graph loaded: {len(infra)} nodes, {len(deps)} edges")

        rn = db.query(RoadNode).all()
        re = db.query(RoadEdge).all()
        road_engine.load_roads(rn, re)
        logger.info(f"Road graph loaded: {len(rn)} nodes, {len(re)} edges")
    finally:
        db.close()

# ─── Helper ────────────────────────────────────────────────────────────────────
def _audit(db: Session, sim_id: str, scenario_id: str, action: str,
           decision: str = None, confidence: float = None,
           reason: str = None, result: dict = None):
    db.add(AuditEvent(
        simulation_id=sim_id,
        scenario_id=scenario_id,
        action=action,
        decision=decision,
        confidence=confidence,
        reason=reason,
        simulated_result=result
    ))
    db.commit()

# ═══════════════════════════  REST API  ═══════════════════════════════════════

# ─── Auth (Mock Prototype) ─────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str = "CITY_COMMAND"

@app.post("/api/auth/login")
def login(req: LoginRequest, response: Response):
    # Mock prototype logic: Accept any password for hackathon
    if not req.email:
        raise HTTPException(400, "Email required")
    
    # Set a dummy cookie
    response.set_cookie(key="lifegrid_auth", value=f"session_{req.email}", httponly=True)
    return {
        "status": "success",
        "user": {
            "id": f"auth-{uuid.uuid4().hex[:6]}",
            "email": req.email,
            "name": f"Operator ({req.role})",
            "role": req.role
        }
    }

@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("lifegrid_auth")
    return {"status": "logged_out"}

@app.get("/api/auth/me")
def get_me(request: Request):
    # Read the dummy cookie
    cookie = request.cookies.get("lifegrid_auth")
    if not cookie:
        raise HTTPException(401, "Not authenticated")
    email = cookie.split("session_")[-1] if "session_" in cookie else "demo@lifegrid.local"
    return {
        "user": {
            "id": "mock-id",
            "email": email,
            "name": "Operator",
            "role": "CITY_COMMAND"
        }
    }

# ─── Public Endpoints (Read-Only) ──────────────────────────────────────────────

@app.get("/api/public/status")
def public_status():
    """Returns simplified system status without exposing internal topology."""
    return {
        "status": "NORMAL", # Would be derived from active public advisories in a real integrated DB
        "message": "LIFEGRID public status API active."
    }

@app.get("/api/public/advisories")
def get_public_advisories():
    """Returns only approved, sanitized public advisories."""
    # In full integration, queries the DB for advisories with status='PUBLISHED'
    return {"advisories": []}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "LIFEGRID App"}

@app.get("/api/bootstrap")
def bootstrap(db: Session = Depends(get_db)):
    zones = db.query(CityZone).count()
    infra = db.query(InfrastructureNode).count()
    roads = db.query(RoadEdge).count()
    return {
        "status": "ok",
        "backend_connected": True,
        "counts": {"zones": zones, "infrastructure": infra, "roads": roads}
    }

@app.get("/api/infrastructure")
def get_infrastructure(db: Session = Depends(get_db)):
    nodes = db.query(InfrastructureNode).all()
    return [
        {
            "id": n.id, "osm_id": n.osm_id, "name": n.name, "type": n.type,
            "zone_id": n.zone_id, "latitude": n.latitude, "longitude": n.longitude,
            "status": n.status, "capacity": n.capacity, "current_load": n.current_load,
            "criticality": n.criticality, "population_served": n.population_served,
            "backup_available": n.backup_available, "backup_type": n.backup_type,
            "backup_duration_minutes": n.backup_duration_minutes,
            "backup_remaining_minutes": n.backup_remaining_minutes,
            "recovery_estimate_minutes": n.recovery_estimate_minutes,
            "data_confidence": n.data_confidence, "evidence_category": n.evidence_category,
            "data_source": n.data_source, "metadata": n.metadata_json
        }
        for n in nodes
    ]

@app.get("/api/roads")
def get_roads(db: Session = Depends(get_db)):
    edges = db.query(RoadEdge).all()
    return [
        {
            "id": e.id, "source_node": e.source_node, "target_node": e.target_node,
            "name": e.name, "distance": e.distance, "road_type": e.road_type,
            "normal_speed": e.normal_speed, "status": e.status, "blocked": e.blocked
        }
        for e in edges
    ]

@app.get("/api/scenarios")
def get_scenarios(db: Session = Depends(get_db)):
    scenarios = db.query(Scenario).all()
    return [
        {
            "id": s.id, "name": s.name, "description": s.description,
            "version": s.version,
            "candidate_interventions": s.candidate_interventions,
            "recovery_sequence": s.recovery_sequence
        }
        for s in scenarios
    ]

# ─── Simulations ───────────────────────────────────────────────────────────────

@app.post("/api/simulations")
def create_simulation(scenario_id: str = Query(...), db: Session = Depends(get_db)):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(404, "Scenario not found")

    sim_id = str(uuid.uuid4())[:8]
    sim = Simulation(id=sim_id, scenario_id=scenario_id, status="CREATED")
    db.add(sim)
    db.commit()

    # Build in-memory state snapshot
    infra = db.query(InfrastructureNode).all()
    node_snap = {n.id: {
        "id": n.id, "name": n.name, "type": n.type,
        "status": n.status, "capacity": n.capacity,
        "current_load": n.current_load, "criticality": n.criticality,
        "population_served": n.population_served,
        "backup_available": n.backup_available,
        "backup_duration_minutes": n.backup_duration_minutes,
        "backup_remaining_minutes": n.backup_remaining_minutes,
        "latitude": n.latitude, "longitude": n.longitude
    } for n in infra}

    sim_states[sim_id] = {
        "scenario_id": scenario_id,
        "time_minutes": 0,
        "status": "CREATED",
        "nodes": node_snap,
        "cascade_events": [],
        "impact": {},
        "accessibility": {},
        "interventions": [],
        "recovery": [],
        "audit": []
    }

    _audit(db, sim_id, scenario_id, "SIMULATION_CREATED")
    return {"id": sim_id, "status": "CREATED", "scenario_id": scenario_id}

@app.post("/api/simulations/{sim_id}/start")
async def start_simulation(sim_id: str, db: Session = Depends(get_db)):
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(404, "Simulation not found")

    sim.status = "RUNNING"
    db.commit()
    if sim_id in sim_states:
        sim_states[sim_id]["status"] = "RUNNING"

    _audit(db, sim_id, sim.scenario_id, "SIMULATION_STARTED")
    await manager.broadcast(sim_id, {"type": "SIMULATION_STATUS", "payload": {"status": "RUNNING"}})

    asyncio.create_task(_run_simulation(sim_id))
    return {"status": "RUNNING"}

@app.post("/api/simulations/{sim_id}/pause")
async def pause_simulation(sim_id: str, db: Session = Depends(get_db)):
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(404)
    sim.status = "PAUSED"
    db.commit()
    if sim_id in sim_states:
        sim_states[sim_id]["status"] = "PAUSED"
    await manager.broadcast(sim_id, {"type": "SIMULATION_STATUS", "payload": {"status": "PAUSED"}})
    return {"status": "PAUSED"}

@app.post("/api/simulations/{sim_id}/resume")
async def resume_simulation(sim_id: str, db: Session = Depends(get_db)):
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(404)
    sim.status = "RUNNING"
    db.commit()
    if sim_id in sim_states:
        sim_states[sim_id]["status"] = "RUNNING"
    await manager.broadcast(sim_id, {"type": "SIMULATION_STATUS", "payload": {"status": "RUNNING"}})
    asyncio.create_task(_run_simulation(sim_id))
    return {"status": "RUNNING"}

@app.post("/api/simulations/{sim_id}/step")
async def step_simulation(sim_id: str, minutes: int = Query(5)):
    state = sim_states.get(sim_id)
    if not state:
        raise HTTPException(404)
    await _advance_time(sim_id, minutes)
    return {"time_minutes": state["time_minutes"]}

@app.post("/api/simulations/{sim_id}/reset")
async def reset_simulation(sim_id: str, db: Session = Depends(get_db)):
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(404)
    sim.status = "CREATED"
    sim.current_time_minutes = 0
    db.commit()
    # Rebuild in-memory state
    infra = db.query(InfrastructureNode).all()
    node_snap = {n.id: {
        "id": n.id, "name": n.name, "type": n.type,
        "status": n.status, "capacity": n.capacity,
        "current_load": n.current_load, "criticality": n.criticality,
        "population_served": n.population_served,
        "backup_available": n.backup_available,
        "backup_duration_minutes": n.backup_duration_minutes,
        "backup_remaining_minutes": n.backup_remaining_minutes,
        "latitude": n.latitude, "longitude": n.longitude
    } for n in infra}
    sim_states[sim_id] = {
        "scenario_id": sim.scenario_id, "time_minutes": 0, "status": "CREATED",
        "nodes": node_snap, "cascade_events": [], "impact": {},
        "accessibility": {}, "interventions": [], "recovery": [], "audit": []
    }
    _audit(db, sim_id, sim.scenario_id, "SIMULATION_RESET")
    await manager.broadcast(sim_id, {"type": "SIMULATION_STATUS", "payload": {"status": "CREATED"}})
    return {"status": "CREATED"}

@app.get("/api/simulations/{sim_id}/state")
def get_sim_state(sim_id: str):
    state = sim_states.get(sim_id)
    if not state:
        raise HTTPException(404)
    return state

@app.get("/api/simulations/{sim_id}/cascade")
def get_cascade(sim_id: str):
    state = sim_states.get(sim_id)
    if not state:
        raise HTTPException(404)
    return {"cascade_events": state.get("cascade_events", [])}

@app.get("/api/simulations/{sim_id}/impact")
def get_impact(sim_id: str):
    state = sim_states.get(sim_id)
    if not state:
        raise HTTPException(404)
    return state.get("impact", {})

@app.get("/api/simulations/{sim_id}/accessibility")
def get_accessibility(sim_id: str):
    state = sim_states.get(sim_id)
    if not state:
        raise HTTPException(404)
    return state.get("accessibility", {})

@app.get("/api/simulations/{sim_id}/interventions")
def get_interventions(sim_id: str, db: Session = Depends(get_db)):
    state = sim_states.get(sim_id)
    if not state:
        raise HTTPException(404)
    # Return scenario-level candidate interventions + generated ones
    scenario = db.query(Scenario).filter(Scenario.id == state["scenario_id"]).first()
    candidates = scenario.candidate_interventions if scenario else []
    return {"candidates": candidates, "generated": state.get("interventions", [])}

@app.post("/api/simulations/{sim_id}/what-if")
async def what_if(sim_id: str, plan_id: str = Query(...)):
    """Clones current state, applies a plan, simulates forward, returns results without mutating live state."""
    state = sim_states.get(sim_id)
    if not state:
        raise HTTPException(404)

    cloned = copy.deepcopy(state)
    # Apply plan on clone (simplified: mark one node recovering)
    for nid, node in cloned["nodes"].items():
        if node["status"] in ("DEGRADED", "FAILED", "PREDICTED_RISK"):
            node["status"] = "RECOVERING"
            break  # Just first for prototype

    cloned_impact = impact_engine.calculate_impact(
        [(nid, 0) for nid, n in cloned["nodes"].items() if n["status"] not in ("OPERATIONAL", "RECOVERING")],
        max(0, state.get("impact", {}).get("cascade_depth", 0) - 1)
    )
    return {"what_if_impact": cloned_impact, "plan_id": plan_id, "note": "Live state not mutated."}

@app.post("/api/simulations/{sim_id}/approve")
async def approve_plan(sim_id: str, plan_type: str = Query(...), db: Session = Depends(get_db)):
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(404)

    state = sim_states.get(sim_id)
    if state:
        state["status"] = "RECOVERING"
        # Begin recovery: heal degraded nodes over time
        for nid, node in state["nodes"].items():
            if node["status"] in ("DEGRADED", "FAILED", "PREDICTED_RISK"):
                node["status"] = "RECOVERING"

        state["recovery"].append({
            "time_minutes": state["time_minutes"],
            "plan": plan_type,
            "message": f"Plan {plan_type} approved. Recovery sequence initiated."
        })

    sim.status = "RECOVERING"
    db.commit()
    _audit(db, sim_id, sim.scenario_id, "PLAN_APPROVED", decision=plan_type)

    await manager.broadcast(sim_id, {"type": "SIMULATION_STATUS", "payload": {"status": "RECOVERING"}})
    await manager.broadcast(sim_id, {"type": "RECOVERY_UPDATED", "payload": {
        "plan": plan_type, "message": f"Plan {plan_type} approved. Recovery initiated."
    }})

    # Schedule recovery progression
    asyncio.create_task(_run_recovery(sim_id))
    return {"status": "RECOVERING"}

@app.post("/api/simulations/{sim_id}/inject-disruption")
async def inject_disruption(sim_id: str, node_id: str = Query(...), disruption_type: str = Query(...), severity: int = Query(...)):
    """Universal Failure Testing System - inject failures into any node type"""
    state = sim_states.get(sim_id)
    if not state:
        raise HTTPException(404)
        
    if node_id not in state["nodes"]:
        raise HTTPException(404, "Node not found")
        
    status = "FAILED" if severity >= 80 else "DEGRADED" if severity >= 40 else "PREDICTED_RISK"
    old_status = state["nodes"][node_id]["status"]
    state["nodes"][node_id]["status"] = status
    
    await manager.broadcast(sim_id, {
        "type": "NODE_STATE_CHANGED",
        "payload": {
            "node_id": node_id, "new_state": status,
            "event": f"Injected {disruption_type} ({severity}% severity)", "time_minutes": state["time_minutes"]
        }
    })
    
    # Immediately trigger cascade evaluation
    asyncio.create_task(_advance_time(sim_id, 0))
    return {"status": "INJECTED", "node_id": node_id, "new_state": status}

@app.post("/api/simulations/{sim_id}/telemetry-loss")
async def set_telemetry_loss(sim_id: str, percentage: int = Query(...)):
    state = sim_states.get(sim_id)
    if not state:
        raise HTTPException(404)

    # Mark some nodes UNKNOWN to simulate telemetry loss
    nodes = list(state["nodes"].values())
    import hashlib
    count_to_lose = int(len(nodes) * percentage / 100)
    # Deterministic selection based on node id hash
    sorted_nodes = sorted(nodes, key=lambda n: hashlib.md5(n["id"].encode()).hexdigest())
    for n in sorted_nodes[:count_to_lose]:
        state["nodes"][n["id"]]["status"] = "UNKNOWN"

    await manager.broadcast(sim_id, {"type": "CONFIDENCE_UPDATED", "payload": {
        "telemetry_loss": percentage,
        "unknown_nodes": count_to_lose
    }})
    return {"telemetry_loss": percentage, "unknown_nodes": count_to_lose}

@app.get("/api/simulations/{sim_id}/recovery")
def get_recovery(sim_id: str):
    state = sim_states.get(sim_id)
    if not state:
        raise HTTPException(404)
    return {"recovery_events": state.get("recovery", [])}

@app.get("/api/simulations/{sim_id}/audit")
def get_audit(sim_id: str, db: Session = Depends(get_db)):
    events = db.query(AuditEvent).filter(AuditEvent.simulation_id == sim_id).order_by(AuditEvent.timestamp).all()
    return [
        {
            "id": e.id, "timestamp": str(e.timestamp), "action": e.action,
            "decision": e.decision, "confidence": e.confidence,
            "reason": e.reason, "result": e.simulated_result
        }
        for e in events
    ]

# ─── Simulation Loop ──────────────────────────────────────────────────────────

async def _advance_time(sim_id: str, minutes: int):
    state = sim_states.get(sim_id)
    if not state:
        return

    db = next(get_db())
    scenario = db.query(Scenario).filter(Scenario.id == state["scenario_id"]).first()
    if not scenario:
        db.close()
        return

    timed_events = scenario.initial_state or {}
    # The actual timed events are stored under different possible keys
    raw_scenario = {}
    # Re-read from file for the timed_events since we stored the full JSON in initial_state
    scenario_file = os.path.join(
        os.path.dirname(__file__), "data", "scenarios",
        f"{state['scenario_id'].lower().replace('-', '-')}.json"
    )
    if os.path.exists(scenario_file):
        with open(scenario_file, 'r') as f:
            raw_scenario = json.load(f)

    timed_events = raw_scenario.get("timed_events", [])
    old_time = state["time_minutes"]
    new_time = old_time + minutes
    state["time_minutes"] = new_time

    await manager.broadcast(sim_id, {
        "type": "SIMULATION_TIME_UPDATED",
        "payload": {"time_minutes": new_time}
    })

    # Process events in [old_time, new_time]
    for ev in timed_events:
        t = ev.get("t_plus_min", 999)
        if old_time < t <= new_time:
            target = ev.get("target_id")
            new_status = ev.get("status")
            event_name = ev.get("event", "")

            if target and target in state["nodes"] and new_status:
                old_status = state["nodes"][target]["status"]
                state["nodes"][target]["status"] = new_status
                state["cascade_events"].append({
                    "time": t, "node_id": target,
                    "event": event_name, "old_status": old_status,
                    "new_status": new_status
                })
                await manager.broadcast(sim_id, {
                    "type": "NODE_STATE_CHANGED",
                    "payload": {
                        "node_id": target, "new_state": new_status,
                        "event": event_name, "time_minutes": t
                    }
                })
                _audit(db, sim_id, state["scenario_id"], "NODE_STATE_CHANGED",
                       reason=event_name)

            elif target and event_name:
                # Events that don't change a node status directly (e.g. info events)
                state["cascade_events"].append({
                    "time": t, "node_id": target,
                    "event": event_name, "new_status": new_status
                })
                await manager.broadcast(sim_id, {
                    "type": "CASCADE_EVENT_CREATED",
                    "payload": {"node_id": target, "event": event_name, "time_minutes": t}
                })
    # Check for dynamic cascades from existing failures
    cascade_events = cascade_engine.evaluate_cascades(new_time, state["nodes"])
    for cev in cascade_events:
        target = cev["target_id"]
        # In a full simulation we would schedule this for (new_time + delay).
        # For this prototype we process it immediately if delay is 0, or log it if not.
        if cev["delay"] == 0 or True: # Force applying for demo visibility
            old_status = state["nodes"][target]["status"]
            if old_status != cev["new_status"]:
                state["nodes"][target]["status"] = cev["new_status"]
                state["cascade_events"].append({
                    "time": new_time, "node_id": target,
                    "event": cev["reason"], "old_status": old_status,
                    "new_status": cev["new_status"]
                })
                await manager.broadcast(sim_id, {
                    "type": "NODE_STATE_CHANGED",
                    "payload": {
                        "node_id": target, "new_state": cev["new_status"],
                        "event": cev["reason"], "time_minutes": new_time
                    }
                })
                _audit(db, sim_id, state["scenario_id"], "CASCADE_PROPAGATION",
                       reason=cev["reason"])
    # Recalculate impact
    affected = [(nid, 0) for nid, n in state["nodes"].items()
                if n["status"] in ("DEGRADED", "FAILED", "PREDICTED_RISK")]
    depth = len([e for e in state["cascade_events"] if e.get("new_status") in ("DEGRADED", "FAILED")])
    impact_res = impact_engine.calculate_impact(affected, min(depth, 10))
    state["impact"] = impact_res
    await manager.broadcast(sim_id, {"type": "IMPACT_UPDATED", "payload": impact_res})

    # Generate interventions once cascade is deep enough
    if len(affected) >= 2 and not state["interventions"]:
        interv_eng = InterventionEngine(db)
        plans = interv_eng.generate_plans(state["scenario_id"], state, impact_res)
        state["interventions"] = plans
        await manager.broadcast(sim_id, {"type": "INTERVENTION_UPDATED", "payload": {"plans": plans}})
        _audit(db, sim_id, state["scenario_id"], "INTERVENTIONS_GENERATED")

    # Update sim record
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if sim:
        sim.current_time_minutes = new_time
        db.commit()

    db.close()


async def _run_simulation(sim_id: str):
    """Automatic simulation loop: advances 5 sim-minutes per real second."""
    for step in range(0, 13):  # 0..60 minutes in 5-min steps
        state = sim_states.get(sim_id)
        if not state or state["status"] != "RUNNING":
            break
        await _advance_time(sim_id, 5)
        await asyncio.sleep(1)  # 1 real second per 5 sim minutes

    state = sim_states.get(sim_id)
    if state and state["status"] == "RUNNING":
        state["status"] = "PAUSED"
        await manager.broadcast(sim_id, {
            "type": "SIMULATION_STATUS",
            "payload": {"status": "PAUSED", "reason": "Awaiting operator decision"}
        })


async def _run_recovery(sim_id: str):
    """Recovery progression: gradually restore nodes to OPERATIONAL."""
    for step in range(5):
        await asyncio.sleep(2)
        state = sim_states.get(sim_id)
        if not state:
            break

        restored = []
        for nid, node in state["nodes"].items():
            if node["status"] == "RECOVERING":
                node["status"] = "OPERATIONAL"
                restored.append(nid)
                break  # One node per step for visual effect

        for nid in restored:
            await manager.broadcast(sim_id, {
                "type": "NODE_STATE_CHANGED",
                "payload": {"node_id": nid, "new_state": "OPERATIONAL", "event": "RECOVERY"}
            })
            state["recovery"].append({
                "time_minutes": state["time_minutes"] + step * 5,
                "event": f"{state['nodes'][nid]['name'] or nid} restored to OPERATIONAL"
            })

        # Recalculate impact
        affected = [(nid, 0) for nid, n in state["nodes"].items()
                    if n["status"] not in ("OPERATIONAL", "UNKNOWN")]
        impact_res = impact_engine.calculate_impact(affected, max(0, len(affected)))
        state["impact"] = impact_res
        await manager.broadcast(sim_id, {"type": "IMPACT_UPDATED", "payload": impact_res})
        await manager.broadcast(sim_id, {"type": "RECOVERY_UPDATED", "payload": {
            "restored": restored, "remaining": len(affected)
        }})

    state = sim_states.get(sim_id)
    if state:
        state["status"] = "COMPLETED"
        await manager.broadcast(sim_id, {
            "type": "SIMULATION_COMPLETED",
            "payload": {"message": "CASCADE CONTAINED — Recovery complete."}
        })


# ═══════════════════════════  WebSocket  ══════════════════════════════════════

@app.websocket("/ws/simulations/{sim_id}")
async def websocket_endpoint(websocket: WebSocket, sim_id: str):
    await manager.connect(websocket, sim_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Could handle incoming commands here
    except WebSocketDisconnect:
        manager.disconnect(websocket, sim_id)


# ═══════════════════════════  Static Files  ═══════════════════════════════════

# Serve React frontend from dist/ (production only)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")

if os.path.exists(frontend_dist):
    # Serve assets directory
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Catch-all: serve index.html for SPA routing
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't catch /api or /ws paths
        if full_path.startswith("api") or full_path.startswith("ws"):
            raise HTTPException(404)
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
