"use client";

import { AppShell, useRequireSession } from "@/components/AppShell";
import { useListAgentsQuery } from "@/lib/api";

export default function AgentsPage() {
  const session = useRequireSession();
  const { data, isLoading, error } = useListAgentsQuery(undefined, {
    skip: !session.accessToken,
  });
  if (!session.accessToken) return null;
  return (
    <AppShell session={session}>
      <h1 className="font-display text-3xl font-semibold">Agents</h1>
      {isLoading ? <p className="mt-4 text-ink-500">Loading…</p> : null}
      {error ? (
        <p role="alert" className="mt-4 text-red-700">
          Failed to load agents
        </p>
      ) : null}
      <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white/80">
        {(data ?? []).length === 0 ? (
          <li className="p-6 text-sm text-ink-500">No agents yet.</li>
        ) : (
          (data ?? []).map((agent) => (
            <li key={agent.id} className="px-6 py-4">
              <p className="font-medium">{agent.name}</p>
              <p className="text-sm text-ink-500">{agent.description || "No description"}</p>
            </li>
          ))
        )}
      </ul>
    </AppShell>
  );
}
