import networkx as nx

class GraphEngine:
    def __init__(self):
        self.graph = nx.DiGraph()

    def load_dependencies(self, db_nodes, db_edges):
        """
        Loads the synthetic dependency graph into NetworkX.
        db_nodes: list of InfrastructureNode
        db_edges: list of DependencyEdge
        """
        self.graph.clear()
        
        for node in db_nodes:
            self.graph.add_node(
                node.id,
                type=node.type,
                name=getattr(node, 'name', node.id),
                status=node.status,
                capacity=node.capacity,
                current_load=node.current_load,
                criticality=getattr(node, 'criticality', 50),
                population_served=getattr(node, 'population_served', 0),
                backup_available=node.backup_available,
                backup_duration_minutes=node.backup_duration_minutes,
                backup_remaining_minutes=node.backup_remaining_minutes,
                zone_id=getattr(node, 'zone_id', None),
                data_confidence=getattr(node, 'data_confidence', 1.0),
            )
            
        for edge in db_edges:
            self.graph.add_edge(
                edge.source_id,
                edge.target_id,
                dependency_type=edge.dependency_type,
                strength=edge.strength,
                propagation_delay_minutes=edge.propagation_delay_minutes,
                minimum_capacity_requirement=edge.minimum_capacity_requirement,
                fallback_available=edge.fallback_available,
                fallback_duration_minutes=edge.fallback_duration_minutes
            )

    def get_downstream_nodes(self, node_id):
        if node_id not in self.graph:
            return []
        return list(nx.descendants(self.graph, node_id))

    def get_immediate_dependents(self, node_id):
        if node_id not in self.graph:
            return []
        return list(self.graph.successors(node_id))

    def get_upstream_sources(self, node_id):
        """Get all nodes that this node depends on (ancestors)."""
        if node_id not in self.graph:
            return []
        return list(nx.ancestors(self.graph, node_id))

    def get_immediate_dependencies(self, node_id):
        """Get direct upstream dependencies of a node."""
        if node_id not in self.graph:
            return []
        return list(self.graph.predecessors(node_id))

    def calculate_recovery_leverage(self, node_id):
        """
        How many downstream nodes are currently at risk that would benefit
        from restoring this node.
        """
        downstream = self.get_downstream_nodes(node_id)
        return len(downstream)

    def get_dependency_chain(self, source_id, target_id):
        """Get the dependency path from source to target."""
        try:
            path = nx.shortest_path(self.graph, source_id, target_id)
            return path
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []

    def get_edge_data(self, source_id, target_id):
        """Get dependency edge data between two nodes."""
        if self.graph.has_edge(source_id, target_id):
            return dict(self.graph[source_id][target_id])
        return None
