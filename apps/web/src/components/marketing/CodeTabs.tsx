"use client";

import { useState } from "react";

const TABS = [
  {
    id: "curl",
    label: "cURL",
    code: `curl -X POST http://localhost:8000/api/v1/executions \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "X-Organization-Id: $ORG" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: demo-001" \\
  -d '{
    "agent_id": "...",
    "agent_version_id": "...",
    "input_payload": {
      "title": "Checkout timeout after deploy",
      "description": "Payments API returns 504 under load"
    }
  }'`,
  },
  {
    id: "sse",
    label: "SSE",
    code: `curl -N http://localhost:8000/api/v1/executions/$ID/events \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "X-Organization-Id: $ORG" \\
  -H "Accept: text/event-stream"

# event: step
# data: {"label":"Found 5 similar tickets", ...}`,
  },
  {
    id: "compose",
    label: "Compose",
    code: `cp .env.example .env
docker compose up --build -d

# Web   http://localhost:3000
# API   http://localhost:8000/docs
# Grafana (profile) http://localhost:3001`,
  },
] as const;

export function CodeTabs() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("curl");
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#0b1628] shadow-lg shadow-slate-900/10">
      <div className="flex gap-1 border-b border-white/10 px-3 pt-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`rounded-t-md px-4 py-2 text-sm font-semibold transition ${
              active === t.id
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto p-5 text-[13px] leading-6 text-slate-200">
        <code>{tab.code}</code>
      </pre>
    </div>
  );
}
