import networkx as nx

class RoadEngine:
    def __init__(self):
        self.graph = nx.DiGraph()

    def load_roads(self, db_nodes, db_edges):
        """
        Loads the road graph into NetworkX.
        db_nodes: list of RoadNode
        db_edges: list of RoadEdge
        """
        self.graph.clear()
        
        for node in db_nodes:
            self.graph.add_node(
                node.id,
                latitude=node.latitude,
                longitude=node.longitude,
                is_junction=node.is_junction
            )
            
        for edge in db_edges:
            self.graph.add_edge(
                edge.source_node,
                edge.target_node,
                id=edge.id,
                name=edge.name,
                distance=edge.distance,
                road_type=edge.road_type,
                normal_speed=edge.normal_speed,
                normal_travel_time=edge.normal_travel_time,
                current_speed=edge.current_speed,
                current_travel_time=edge.current_travel_time,
                capacity=edge.capacity,
                status=edge.status,
                blocked=edge.blocked,
                confidence=edge.confidence
            )

    def get_shortest_path(self, source, target, weight='current_travel_time'):
        try:
            path = nx.shortest_path(self.graph, source, target, weight=weight)
            length = nx.shortest_path_length(self.graph, source, target, weight=weight)
            return path, length
        except nx.NetworkXNoPath:
            return None, float('inf')
        except nx.NodeNotFound:
            return None, float('inf')
