class InterventionEngine:
    def __init__(self, db_session):
        self.db = db_session

    def generate_plans(self, scenario_id, current_state, impact_score):
        """
        Generates NO_ACTION, PLAN_A, PLAN_B, and a RECOMMENDED plan.
        Uses deterministic rule-based feasibility logic.
        """
        # In a real implementation we would clone state and simulate forward.
        # For prototype we generate static candidates based on impact depth.
        
        plans = []
        
        # NO ACTION
        plans.append({
            "name": "NO ACTION",
            "plan_type": "NO_ACTION",
            "description": "Allow cascade to propagate without intervention.",
            "expected_cascade_depth": min(impact_score.get('cascade_depth', 0) + 3, 10),
            "emergency_delay_minutes": 45.0,
            "recovery_time_minutes": impact_score.get('estimated_recovery_time_minutes', 0) * 2,
            "operational_feasibility": 1.0
        })
        
        # PLAN A: Dispatch Emergency Maintenance
        plans.append({
            "name": "Dispatch Emergency Maintenance",
            "plan_type": "PLAN_A",
            "description": "Send available maintenance crews to critical failed nodes.",
            "expected_cascade_depth": max(0, impact_score.get('cascade_depth', 0) - 1),
            "emergency_delay_minutes": 20.0,
            "recovery_time_minutes": int(impact_score.get('estimated_recovery_time_minutes', 0) * 0.7),
            "operational_feasibility": 0.85
        })
        
        # RECOMMENDED: Mobile Generators + Traffic Rerouting
        plans.append({
            "name": "Power Restore + Traffic Reroute",
            "plan_type": "RECOMMENDED",
            "description": "Deploy mobile generators to critical junctions and reroute EMS vehicles.",
            "expected_cascade_depth": 0,
            "emergency_delay_minutes": 10.0,
            "recovery_time_minutes": int(impact_score.get('estimated_recovery_time_minutes', 0) * 0.4),
            "operational_feasibility": 0.95
        })
        
        return plans
