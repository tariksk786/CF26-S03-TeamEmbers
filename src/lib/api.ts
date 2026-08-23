// API Client for LIFEGRID Backend

// Helper to construct dynamic URLs
const getBaseUrl = () => {
  // In development Vite proxy handles /api, in production they are served from same origin
  return "";
};

const getWsUrl = (simId: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/ws/simulations/${simId}`;
};

export const api = {
  bootstrap: async () => {
    const res = await fetch(`${getBaseUrl()}/api/bootstrap`);
    return res.json();
  },
  
  getInfrastructure: async () => {
    const res = await fetch(`${getBaseUrl()}/api/infrastructure`);
    return res.json();
  },
  
  getRoads: async () => {
    const res = await fetch(`${getBaseUrl()}/api/roads`);
    return res.json();
  },
  
  getScenarios: async () => {
    const res = await fetch(`${getBaseUrl()}/api/scenarios`);
    return res.json();
  },
  
  createSimulation: async (scenarioId: string) => {
    const res = await fetch(`${getBaseUrl()}/api/simulations?scenario_id=${scenarioId}`, {
      method: "POST"
    });
    return res.json();
  },
  
  startSimulation: async (simId: string) => {
    const res = await fetch(`${getBaseUrl()}/api/simulations/${simId}/start`, {
      method: "POST"
    });
    return res.json();
  },
  
  approvePlan: async (simId: string, planType: string) => {
    const res = await fetch(`${getBaseUrl()}/api/simulations/${simId}/approve?plan_type=${planType}`, {
      method: "POST"
    });
    return res.json();
  }
};

export const connectSimulationWebSocket = (simId: string, onMessage: (msg: any) => void) => {
  const ws = new WebSocket(getWsUrl(simId));
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error("Error parsing websocket message", e);
    }
  };
  
  ws.onerror = (err) => {
    console.error("WebSocket error:", err);
  };
  
  return ws;
};
