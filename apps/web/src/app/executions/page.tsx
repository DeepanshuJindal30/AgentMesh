"use client";

import Link from "next/link";
import { AppShell, useRequireSession } from "@/components/AppShell";
import { useListExecutionsQuery } from "@/lib/api";

export default function ExecutionsPage() {
  const session = useRequireSession();
  const { data, isLoading } = useListExecutionsQuery(undefined, {
    skip: !session.accessToken,
    pollingInterval: 4000,
  });
  if (!session.accessToken) return null;
  return (
    <AppShell session={session}>
      <h1 className="font-display text-3xl font-semibold">Executions</h1>
      {isLoading ? <p className="mt-4 text-ink-500">Loading…</p> : null}
      <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white/80">
        {(data ?? []).length === 0 ? (
          <li className="p-6 text-sm text-ink-500">No executions yet.</li>
        ) : (
          (data ?? []).map((ex) => (
            <li key={ex.id} className="flex items-center justify-between px-6 py-4 text-sm">
              <Link href={`/executions/${ex.id}`} className="font-mono text-xs text-accent-600 hover:underline">
                {ex.id.slice(0, 8)}…
              </Link>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">{ex.status}</span>
            </li>
          ))
        )}
      </ul>
    </AppShell>
  );
}
