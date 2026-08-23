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
                status=node.status,
                capacity=node.capacity,
                current_load=node.current_load,
                backup_available=node.backup_available,
                backup_duration_minutes=node.backup_duration_minutes,
                backup_remaining_minutes=node.backup_remaining_minutes
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
