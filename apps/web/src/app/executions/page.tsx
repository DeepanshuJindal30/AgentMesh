"use client";

import Link from "next/link";
import { AppShell, useRequireSession } from "@/components/AppShell";
import { DemoRunPanel } from "@/components/DemoRunPanel";
import { useListExecutionsQuery } from "@/lib/api";

export default function ExecutionsPage() {
  const session = useRequireSession();
  const { data, isLoading } = useListExecutionsQuery(undefined, {
    skip: !session.accessToken,
    pollingInterval: 3000,
  });
  if (!session.accessToken) return null;
  return (
    <AppShell session={session}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Executions</h1>
          <p className="mt-1 text-sm text-ink-600">
            Click a run to open the live SSE timeline.
          </p>
        </div>
        <DemoRunPanel compact />
      </div>

      {isLoading ? <p className="mt-4 text-ink-500">Loading…</p> : null}
      <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white/80">
        {(data ?? []).length === 0 ? (
          <li className="p-6 text-sm text-ink-500">
            No executions yet. Hit <strong>Run live demo</strong> to start one.
          </li>
        ) : (
          (data ?? []).map((ex) => (
            <li key={ex.id} className="flex items-center justify-between gap-4 px-6 py-4 text-sm">
              <div className="min-w-0">
                <Link
                  href={`/executions/${ex.id}`}
                  className="font-mono text-xs text-accent-600 hover:underline"
                >
                  {ex.id}
                </Link>
                <p className="mt-1 truncate text-ink-500">
                  {(ex.input_payload?.title as string) || "Untitled incident"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">{ex.status}</span>
                <Link
                  href={`/executions/${ex.id}`}
                  className="font-semibold text-accent-600 hover:underline"
                >
                  Watch live →
                </Link>
              </div>
            </li>
          ))
        )}
      </ul>
    </AppShell>
  );
}
