class AccessibilityEngine:
    def __init__(self, road_engine):
        self.road_engine = road_engine

    def calculate_eta(self, source_node, target_node, vehicle_priority="NORMAL"):
        """
        Calculates the ETA between two points using the current road network state.
        For emergencies (P1/P2/P3), we might use different assumptions, but for now we
        rely on 'current_travel_time' weights.
        """
        path, length = self.road_engine.get_shortest_path(source_node, target_node, weight='current_travel_time')
        if not path:
            return None, float('inf')
            
        # Simplified delay calculation based on path length (minutes)
        return path, length
        
    def evaluate_accessibility(self, hospital_nodes, incident_node):
        """
        Calculates how accessible a list of hospitals are from an incident zone/node.
        Returns the best hospital and accessibility score.
        """
        results = []
        for hospital in hospital_nodes:
            # Assuming hospital has a closest_road_node property, 
            # for prototype we just use hospital id mapping to road node if possible
            path, eta = self.calculate_eta(incident_node, hospital)
            results.append({
                "hospital_id": hospital,
                "eta_minutes": eta,
                "path": path
            })
            
        # Sort by ETA
        results.sort(key=lambda x: x["eta_minutes"])
        
        best_hospital = results[0] if results else None
        
        # Calculate score (100 = 0 mins, 0 = 60+ mins)
        score = 0
        if best_hospital and best_hospital["eta_minutes"] != float('inf'):
            score = max(0, 100 - (best_hospital["eta_minutes"] * 1.5))
            
        return {
            "best_hospital": best_hospital,
            "accessibility_score": score,
            "alternatives": results[1:3]
        }
