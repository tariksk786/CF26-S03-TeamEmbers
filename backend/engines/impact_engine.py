class ImpactEngine:
    def __init__(self, graph_engine, road_engine):
        self.graph_engine = graph_engine
        self.road_engine = road_engine

    def calculate_impact(self, affected_nodes, cascade_depth):
        """
        Calculates the Life-Safety Impact Score based on affected infrastructure.
        """
        score = 0
        population_affected = 0
        critical_facilities_at_risk = 0
        affected_services = set()
        
        for node_id, _ in affected_nodes:
            node_data = self.graph_engine.graph.nodes.get(node_id)
            if not node_data:
                continue
                
            # Weighted scoring
            criticality = node_data.get('criticality', 50)
            score += criticality * 0.1
            
            population_affected += node_data.get('population_served', 0)
            
            node_type = node_data.get('type')
            affected_services.add(node_type)
            
            if node_type in ['HOSPITAL', 'FIRE_EMS', 'POLICE', 'WATER']:
                critical_facilities_at_risk += 1
                score += 20 # additional penalty for critical facilities
                
        # Non-linear scaling based on cascade depth
        score += cascade_depth * 15
        
        # Determine recovery difficulty based on nodes (simplified)
        estimated_recovery_time = len(affected_nodes) * 30 # roughly 30 mins per node affected
        
        return {
            "life_safety_score": min(int(score), 100),
            "population_affected": population_affected,
            "critical_facilities_at_risk": critical_facilities_at_risk,
            "affected_services": list(affected_services),
            "cascade_depth": cascade_depth,
            "estimated_recovery_time_minutes": estimated_recovery_time
        }
