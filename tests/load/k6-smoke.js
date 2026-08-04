/**
 * k6 smoke / light load template for AgentMesh.
 *
 * Usage (local stack running):
 *   k6 run tests/load/k6-smoke.js
 *
 * Auth: set AGENTMESH_TOKEN and AGENTMESH_ORG_ID after logging in via API.
 * Do not invent throughput numbers in docs — record your own run output.
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

const BASE = __ENV.API_BASE_URL || "http://127.0.0.1:8000";
const TOKEN = __ENV.AGENTMESH_TOKEN || "";
const ORG = __ENV.AGENTMESH_ORG_ID || "";

export default function () {
  const health = http.get(`${BASE}/health`);
  check(health, {
    "health status 200": (r) => r.status === 200,
  });

  if (TOKEN && ORG) {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "X-Organization-Id": ORG,
    };
    const usage = http.get(`${BASE}/api/v1/usage`, { headers });
    check(usage, {
      "usage status 200": (r) => r.status === 200,
    });
  }

  sleep(1);
}
