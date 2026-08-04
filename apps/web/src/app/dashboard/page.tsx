"use client";

import {
  useCreateAgentMutation,
  useCreateExecutionMutation,
  useListAgentsQuery,
  useListExecutionsQuery,
  useMeQuery,
  usePublishAgentMutation,
} from "@/lib/api";
import { AppShell, useRequireSession } from "@/components/AppShell";

export default function DashboardPage() {
  const session = useRequireSession();
  const { data: me, isLoading: meLoading } = useMeQuery(undefined, {
    skip: !session.accessToken,
  });
  const { data: agents } = useListAgentsQuery(undefined, { skip: !session.accessToken });
  const { data: executions } = useListExecutionsQuery(undefined, {
    skip: !session.accessToken,
  });
  const [createAgent, createState] = useCreateAgentMutation();
  const [publishAgent] = usePublishAgentMutation();
  const [createExecution] = useCreateExecutionMutation();

  if (!session.accessToken) {
    return <div className="p-8 text-sm text-ink-500">Redirecting to login…</div>;
  }

  const canCreate = me?.permissions.includes("agent:create") ?? false;
  const canPublish = me?.permissions.includes("agent:publish") ?? false;
  const canRun = me?.permissions.includes("execution:run") ?? false;

  return (
    <AppShell session={session}>
      <h1 className="font-display text-3xl font-semibold text-ink-950">Dashboard</h1>
      <p className="mt-2 text-ink-700">
        Signed in as {session.email}
        {meLoading ? " · loading permissions…" : ` · ${me?.permissions.length ?? 0} permissions`}
      </p>

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

      <section className="mt-10 rounded-lg border border-slate-200 bg-white/80 p-5">
        <h2 className="font-semibold text-ink-900">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {canCreate ? (
            <button
              type="button"
              disabled={createState.isLoading}
              className="rounded bg-accent-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={async () => {
                const agent = await createAgent({
                  name: "Ticket Similarity Agent",
                  description: "Finds similar historical tickets for a new incident",
                  configuration: { type: "ticket_similarity", top_k: 5, provider: "mock" },
                }).unwrap();
                if (canPublish) await publishAgent(agent.id);
              }}
            >
              Create + publish Ticket Similarity Agent
            </button>
          ) : (
            <p className="text-sm text-ink-500">Viewer cannot create agents.</p>
          )}

          {canRun && agents && agents.length > 0 ? (
            <button
              type="button"
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold"
              onClick={async () => {
                await createExecution({
                  agent_id: agents[0]!.id,
                  input_payload: {
                    title: "Checkout timeout after deploy",
                    description: "Payments API returns 504 under load",
                  },
                  idempotencyKey: crypto.randomUUID(),
                });
              }}
            >
              Submit sample execution
            </button>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
