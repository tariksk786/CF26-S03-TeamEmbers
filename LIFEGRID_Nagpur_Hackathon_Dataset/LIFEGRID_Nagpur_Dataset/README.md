# LIFEGRID Nagpur Hackathon Dataset

This package was generated from the uploaded `map.osm` Nagpur export for the LIFEGRID prototype.

## Source
- Geographic source: OpenStreetMap (`map.osm`)
- Bounds: {'minlat': 21.13867, 'minlon': 79.06727, 'maxlat': 21.15568, 'maxlon': 79.09255}
- Attribution: © OpenStreetMap contributors, ODbL

## What is real/source-derived
- Selected Nagpur road geometry and connectivity
- Mapped junction coordinates
- Mapped hospitals/clinics
- Mapped police/transit/rail facilities where present

## What is simulated by LIFEGRID
- Power, telecom, water and EMS operational assets not present in the supplied extract
- Infrastructure dependency strengths and propagation delays
- Traffic/load/status values
- Population estimates by simulation zone
- Emergency vehicle states
- Rainfall profile
- Interventions and recovery outcomes

These simulated values are intentionally labelled `LIFEGRID_SIMULATION` and must not be presented as live/official Nagpur government data.

## Processed files
- `processed/nagpur_roads.geojson` — selected drivable roads
- `processed/nagpur_road_graph.json` — routing graph nodes + edges
- `processed/nagpur_junctions.geojson` — top junctions for UI
- `processed/nagpur_hospitals.geojson` — mapped hospitals/clinics
- `processed/nagpur_critical_facilities.geojson` — mapped critical/public facilities
- `processed/nagpur_zones.geojson` — 6 LIFEGRID simulation zones
- `processed/lifegrid_infrastructure_nodes.json` — backend-ready infrastructure layer
- `processed/lifegrid_dependencies.json` — synthetic cascade dependency graph
- `processed/lifegrid_resources.json`
- `processed/lifegrid_emergency_vehicles.json`
- `processed/lifegrid_weather.json`
- `processed/scenario_index.json`
- `scenarios/*.json` — 8 deterministic hackathon scenarios

## Size philosophy
This package intentionally avoids full-city/state datasets. It is designed for a fast hackathon backend, Railway deployment, NetworkX routing/cascade simulation, and an offline-capable Leaflet overlay.

## Recommended project location
Copy the `processed/` and `scenarios/` folders into:

```
backend/data/processed/
backend/data/scenarios/
```

Keep the raw `map.osm` only under `backend/data/raw/` if you want reproducible re-imports; do not parse it on every app start.

## Backend usage
Seed PostgreSQL from the processed files, then build:
1. Road graph from `nagpur_road_graph.json`
2. Infrastructure graph from `lifegrid_infrastructure_nodes.json`
3. Cascade edges from `lifegrid_dependencies.json`
4. Scenarios from `scenarios/*.json`

The frontend should call FastAPI and receive WebSocket simulation updates while retaining its local deterministic fallback mode.
