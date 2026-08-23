class CascadeEngine:
    def __init__(self, graph_engine):
        self.graph_engine = graph_engine

    def evaluate_cascades(self, current_time_minutes, node_states):
        """
        Dynamically evaluates dependencies across the entire graph.
        Returns a list of newly triggered cascade events.
        node_states is a dict: {node_id: {"status": "FAILED", "capacity": ..., etc}}
        """
        new_events = []
        
        # We iterate over all edges to find dependencies that might be violated
        for u, v, edge_data in self.graph_engine.graph.edges(data=True):
            source_state = node_states.get(u, {})
            target_state = node_states.get(v, {})
            
            # If target is already failed, skip
            if target_state.get("status") == "FAILED":
                continue
                
            # Check if source is failed or degraded
            if source_state.get("status") in ("FAILED", "DEGRADED"):
                
                # Rule 1: Dependency Strength
                strength = edge_data.get("strength", 1.0)
                if strength < 0.3:
                    continue # Too weak to cause immediate failure
                    
                # Rule 2: Minimum Capacity Requirement
                req_capacity = edge_data.get("minimum_capacity_requirement", 0)
                source_capacity = source_state.get("capacity", 100)
                if source_state.get("status") == "DEGRADED" and source_capacity >= req_capacity:
                    continue # Still operating above minimum threshold
                    
                # Rule 3: Propagation Delay
                delay = edge_data.get("propagation_delay_minutes", 0)
                # If we were tracking exact failure times, we would check if (current_time - failure_time >= delay).
                # For this simplified prototype, we assume the delay determines if it fails *now* or *later*.
                # We will schedule it if it's not already scheduled. (Handled by Event Engine)
                
                # Rule 4: Fallback / Backup
                fallback = edge_data.get("fallback_available", False)
                target_backup = target_state.get("backup_available", False)
                target_backup_rem = target_state.get("backup_remaining_minutes", 0)
                
                if fallback or (target_backup and target_backup_rem > 0):
                    # Node degrades but doesn't immediately fail
                    if target_state.get("status") == "OPERATIONAL":
                        new_events.append({
                            "target_id": v,
                            "new_status": "DEGRADED",
                            "delay": delay,
                            "reason": f"Source {u} failed, but fallback is available."
                        })
                else:
                    # Hard failure
                    if target_state.get("status") != "FAILED":
                        new_events.append({
                            "target_id": v,
                            "new_status": "FAILED",
                            "delay": delay,
                            "reason": f"Source {u} failed and no fallback available."
                        })
                        
        return new_events
