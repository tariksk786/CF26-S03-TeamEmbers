"""
LIFEGRID Impact Engine
Calculates separated impact metrics with deterministic, documented weights.
"""

CRITICAL_TYPES = {'HOSPITAL', 'hospital', 'FIRE_EMS', 'fire_station', 'ambulance_station', 'WATER', 'water', 'telecom'}


class ImpactEngine:
    def __init__(self, graph_engine, road_engine):
        self.graph_engine = graph_engine
        self.road_engine = road_engine

    def calculate_impact(self, affected_nodes, cascade_depth):
        """
        Calculates separated impact metrics.
        Returns dict with individual metrics + overall priority score.
        
        Documented Weights:
        - Life-Safety Risk: criticality * 0.1 + 20 per critical facility (higher = worse)
        - Population Service Disruption: sum of population_served for affected nodes
        - Emergency Accessibility: inverse of route accessibility (higher = better)
        - Critical Facility Risk: count of critical facilities affected (higher = worse)
        - Network Congestion: based on affected service count (higher = worse)
        - Data Confidence: average confidence across affected nodes (higher = better)
        - Recovery Progress: ratio of recovering/operational to total (higher = better)
        """
        life_safety_score = 0
        population_affected = 0
        population_service_disruption = 0
        critical_facilities_at_risk = 0
        affected_services = set()
        total_confidence = 0.0
        confidence_count = 0
        recovering_count = 0
        total_affected = len(affected_nodes)
        
        for node_id, _ in affected_nodes:
            node_data = self.graph_engine.graph.nodes.get(node_id)
            if not node_data:
                continue
                
            # Weighted scoring
            criticality = node_data.get('criticality', 50)
            life_safety_score += criticality * 0.1
            
            pop = node_data.get('population_served', 0)
            population_affected += pop
            population_service_disruption += pop
            
            node_type = node_data.get('type', '')
            affected_services.add(node_type)
            
            if node_type in CRITICAL_TYPES:
                critical_facilities_at_risk += 1
                life_safety_score += 20  # additional penalty for critical facilities
            
            # Data confidence
            conf = node_data.get('data_confidence', 1.0)
            if isinstance(conf, (int, float)):
                if conf > 1:
                    conf = conf / 100.0
                total_confidence += conf
                confidence_count += 1

            # Recovery progress
            status = node_data.get('status', 'FAILED')
            if status == 'RECOVERING':
                recovering_count += 1
                
        # Non-linear scaling based on cascade depth
        life_safety_score += cascade_depth * 15
        
        # Determine recovery difficulty
        estimated_recovery_time = len(affected_nodes) * 30
        
        # Emergency Accessibility (100 = full access, 0 = no access)
        emergency_accessibility = max(0, 100 - (len(affected_services) * 15) - (cascade_depth * 5))
        
        # Network Congestion (0 = no congestion, 100 = gridlock)
        network_congestion = min(100, len(affected_services) * 12 + cascade_depth * 8)
        
        # Data Confidence average (0-1 scale)
        avg_confidence = (total_confidence / confidence_count) if confidence_count > 0 else 1.0
        
        # Recovery Progress (0-100)
        recovery_progress = (recovering_count / total_affected * 100) if total_affected > 0 else 100
        
        return {
            "life_safety_score": min(int(life_safety_score), 100),
            "population_affected": population_affected,
            "population_service_disruption": population_service_disruption,
            "critical_facilities_at_risk": critical_facilities_at_risk,
            "affected_services": list(affected_services),
            "cascade_depth": cascade_depth,
            "estimated_recovery_time_minutes": estimated_recovery_time,
            "emergency_accessibility": round(emergency_accessibility, 1),
            "network_congestion": round(network_congestion, 1),
            "data_confidence": round(avg_confidence, 2),
            "recovery_progress": round(recovery_progress, 1),
        }

    def calculate_detailed_impact(self, node_states, graph_engine):
        """
        Calculate comprehensive impact including hospital accessibility differentiation.
        Returns enhanced impact dict.
        """
        affected = [(nid, 0) for nid, n in node_states.items()
                     if n.get("status") in ("DEGRADED", "FAILED", "PREDICTED_RISK")]
        
        depth = len([nid for nid, n in node_states.items()
                      if n.get("status") in ("DEGRADED", "FAILED")])
        
        base_impact = self.calculate_impact(affected, min(depth, 10))
        
        # Hospital operational state vs accessibility differentiation
        hospitals = {nid: n for nid, n in node_states.items()
                     if n.get("type") in ("hospital",)}
        
        hospital_assessments = []
        for h_id, h in hospitals.items():
            operational_state = h.get("status", "OPERATIONAL")
            
            # Accessibility is different from operational state
            # A hospital can be operational but inaccessible
            accessibility = "ACCESSIBLE"
            if operational_state == "FAILED":
                accessibility = "INACCESSIBLE"
            else:
                # Check if routes to hospital are affected
                route_nodes = graph_engine.get_upstream_sources(h_id) if hasattr(graph_engine, 'get_upstream_sources') else []
                blocked_routes = [r for r in route_nodes 
                                  if node_states.get(r, {}).get("status") in ("FAILED",)
                                  and node_states.get(r, {}).get("type") in ("emergency_route", "traffic")]
                if blocked_routes:
                    accessibility = "RESTRICTED"
                elif any(node_states.get(r, {}).get("status") == "DEGRADED" 
                        for r in route_nodes 
                        if node_states.get(r, {}).get("type") in ("emergency_route", "traffic")):
                    accessibility = "DEGRADED"
            
            hospital_assessments.append({
                "id": h_id,
                "name": h.get("name", h_id),
                "operational_state": operational_state,
                "accessibility": accessibility,
                "load": h.get("current_load", 0),
                "capacity": h.get("capacity", 100),
            })
        
        base_impact["hospital_assessments"] = hospital_assessments
        
        return base_impact
