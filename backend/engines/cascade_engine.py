class CascadeEngine:
    def __init__(self, graph_engine):
        self.graph_engine = graph_engine
        self.interaction_rules = []

    def set_interaction_rules(self, rules):
        """
        Set compound interaction rules. Each rule:
        {
            "conditions": [{"type": "water", "status": "DEGRADED"}, {"type": "power", "status": "FAILED"}],
            "effect": {"targetType": "traffic", "capacityMultiplier": 0.42, "description": "..."}
        }
        """
        self.interaction_rules = rules or []

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
                
                # Rule 4: Fallback / Backup
                fallback = edge_data.get("fallback_available", False)
                target_backup = target_state.get("backup_available", False)
                target_backup_rem = target_state.get("backup_remaining_minutes", 0)
                
                if fallback or (target_backup and target_backup_rem > 0):
                    # Node degrades but doesn't immediately fail
                    if target_state.get("status") == "OPERATIONAL":
                        new_events.append({
                            "target_id": v,
                            "source_id": u,
                            "new_status": "DEGRADED",
                            "delay": delay,
                            "reason": f"Source {source_state.get('name', u)} failed, but fallback is available.",
                            "is_cascade": True,
                        })
                else:
                    # Hard failure
                    if target_state.get("status") != "FAILED":
                        new_events.append({
                            "target_id": v,
                            "source_id": u,
                            "new_status": "FAILED",
                            "delay": delay,
                            "reason": f"Source {source_state.get('name', u)} failed and no fallback available.",
                            "is_cascade": True,
                        })

        # ─── Compound Interaction Effects ──────────────────────────────────
        compound_events = self._evaluate_compound_interactions(node_states)
        new_events.extend(compound_events)

        # ─── Telecom → Data Confidence Impact ─────────────────────────────
        telecom_events = self._evaluate_telecom_confidence_impact(node_states)
        new_events.extend(telecom_events)

        return new_events

    def _evaluate_compound_interactions(self, node_states):
        """
        Evaluate configurable compound interaction rules.
        When multiple conditions are met, apply non-linear combined effects.
        """
        events = []

        for rule in self.interaction_rules:
            conditions = rule.get("conditions", [])
            effect = rule.get("effect", {})

            # Check if all conditions are met
            all_met = True
            for cond in conditions:
                cond_type = cond.get("type", "")
                cond_status = cond.get("status", "FAILED")

                # Find any node of this type matching the condition
                found = False
                for nid, nstate in node_states.items():
                    if nstate.get("type") == cond_type and nstate.get("status") == cond_status:
                        found = True
                        break
                if not found:
                    all_met = False
                    break

            if all_met:
                # Apply compound effect to target type nodes
                target_type = effect.get("targetType", "")
                multiplier = effect.get("capacityMultiplier", 1.0)
                description = effect.get("description", "Compound interaction effect")

                for nid, nstate in node_states.items():
                    if nstate.get("type") == target_type and nstate.get("status") in ("OPERATIONAL", "DEGRADED"):
                        # The capacity drop should degrade the node
                        if multiplier < 0.5 and nstate.get("status") != "DEGRADED":
                            events.append({
                                "target_id": nid,
                                "source_id": "COMPOUND",
                                "new_status": "DEGRADED",
                                "delay": 0,
                                "reason": f"Compound effect: {description}",
                                "is_cascade": True,
                                "is_compound": True,
                            })

        return events

    def _evaluate_telecom_confidence_impact(self, node_states):
        """
        When telecom nodes fail, affected telemetry sources should show reduced confidence.
        """
        events = []
        telecom_failed = False

        for nid, nstate in node_states.items():
            if nstate.get("type") == "telecom" and nstate.get("status") in ("FAILED", "DEGRADED"):
                telecom_failed = True
                break

        if telecom_failed:
            # Mark some nodes as having degraded confidence
            for nid, nstate in node_states.items():
                if nstate.get("type") not in ("telecom",) and nstate.get("status") not in ("UNKNOWN", "FAILED"):
                    # We don't change status here — just flag for the impact engine
                    # The actual confidence reduction is handled at the state level
                    pass

        return events

    def get_cascade_chain(self, root_node_id, node_states):
        """
        Trace the cascade chain from a root failure.
        Returns ordered list of affected nodes with reasons.
        """
        chain = []
        visited = set()
        queue = [root_node_id]

        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)

            dependents = self.graph_engine.get_immediate_dependents(current)
            for dep in dependents:
                dep_state = node_states.get(dep, {})
                if dep_state.get("status") in ("DEGRADED", "FAILED", "PREDICTED_RISK"):
                    edge_data = self.graph_engine.get_edge_data(current, dep)
                    chain.append({
                        "node_id": dep,
                        "caused_by": current,
                        "status": dep_state.get("status"),
                        "dependency_type": edge_data.get("dependency_type", "unknown") if edge_data else "unknown",
                        "strength": edge_data.get("strength", 1.0) if edge_data else 1.0,
                    })
                    queue.append(dep)

        return chain
