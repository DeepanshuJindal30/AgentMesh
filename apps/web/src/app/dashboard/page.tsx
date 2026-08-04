"use client";

import {
  useListAgentsQuery,
  useListExecutionsQuery,
  useMeQuery,
} from "@/lib/api";
import { AppShell, useRequireSession } from "@/components/AppShell";
import { DemoRunPanel } from "@/components/DemoRunPanel";
import Link from "next/link";

export default function DashboardPage() {
  const session = useRequireSession();
  const { data: me, isLoading: meLoading } = useMeQuery(undefined, {
    skip: !session.accessToken,
  });
  const { data: agents } = useListAgentsQuery(undefined, { skip: !session.accessToken });
  const { data: executions } = useListExecutionsQuery(undefined, {
    skip: !session.accessToken,
    pollingInterval: 5000,
  });

  if (!session.accessToken) {
    return <div className="p-8 text-sm text-ink-500">Redirecting to login…</div>;
  }

  const recent = (executions ?? []).slice(0, 5);

  return (
    <AppShell session={session}>
      <h1 className="font-display text-3xl font-semibold text-ink-950">Dashboard</h1>
      <p className="mt-2 text-ink-700">
        Signed in as {session.email}
        {meLoading ? " · loading permissions…" : ` · ${me?.permissions.length ?? 0} permissions`}
      </p>

      <div className="mt-8">
        <DemoRunPanel />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white/80 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Agents</h2>
          <p className="mt-2 font-display text-3xl">{agents?.length ?? "—"}</p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white/80 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Executions
          </h2>
          <p className="mt-2 font-display text-3xl">{executions?.length ?? "—"}</p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white/80 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Role</h2>
          <p className="mt-2 font-display text-3xl capitalize">
            {session.role?.replace("_", " ")}
          </p>
        </section>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold text-ink-900">Recent executions</h2>
          <Link href="/executions" className="text-sm font-semibold text-accent-600">
            View all →
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white/80">
          {recent.length === 0 ? (
            <li className="p-5 text-sm text-ink-500">
              No runs yet — use <strong>Run live demo</strong> above.
            </li>
          ) : (
            recent.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <Link
                  href={`/executions/${ex.id}`}
                  className="font-mono text-xs text-accent-600 hover:underline"
                >
                  {ex.id.slice(0, 8)}…
                </Link>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">{ex.status}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </AppShell>
  );
}
