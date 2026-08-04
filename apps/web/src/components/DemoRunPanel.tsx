"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useCreateAgentMutation,
  useCreateExecutionMutation,
  useListAgentsQuery,
  useMeQuery,
  usePublishAgentMutation,
} from "@/lib/api";

const SAMPLE_INPUT = {
  title: "Checkout timeout after deploy",
  description: "Payments API returns 504 under load after canary release",
};

export function DemoRunPanel({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { data: me } = useMeQuery();
  const { data: agents, refetch: refetchAgents } = useListAgentsQuery();
  const [createAgent, createAgentState] = useCreateAgentMutation();
  const [publishAgent] = usePublishAgentMutation();
  const [createExecution, createExecState] = useCreateExecutionMutation();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const canCreate = me?.permissions.includes("agent:create") ?? false;
  const canPublish = me?.permissions.includes("agent:publish") ?? false;
  const canRun = me?.permissions.includes("execution:run") ?? false;
  const busy = createAgentState.isLoading || createExecState.isLoading;

  async function ensureAgent(): Promise<string> {
    const list = agents ?? (await refetchAgents().unwrap());
    const existing = list.find((a) => a.name.toLowerCase().includes("ticket"));
    if (existing) return existing.id;

    if (!canCreate || !canPublish) {
      throw new Error("No Ticket Similarity agent found, and your role cannot create one.");
    }
    setStatus("Creating and publishing Ticket Similarity agent…");
    const agent = await createAgent({
      name: "Ticket Similarity Agent",
      description: "Finds similar historical tickets for a new incident",
      configuration: { type: "ticket_similarity", top_k: 5, provider: "mock" },
    }).unwrap();
    await publishAgent(agent.id).unwrap();
    return agent.id;
  }

  async function runDemo() {
    setError(null);
    setStatus(null);
    if (!canRun) {
      setError("Your role cannot run executions. Sign in as admin, developer, or operator.");
      return;
    }
    try {
      setStatus("Preparing agent…");
      const agentId = await ensureAgent();
      setStatus("Submitting execution…");
      const execution = await createExecution({
        agent_id: agentId,
        input_payload: SAMPLE_INPUT,
        idempotencyKey: crypto.randomUUID(),
      }).unwrap();
      setStatus("Opening live timeline…");
      router.push(`/executions/${execution.id}`);
    } catch (err) {
      const message =
        err && typeof err === "object" && "data" in err
          ? JSON.stringify((err as { data: unknown }).data)
          : err instanceof Error
            ? err.message
            : "Failed to start demo execution";
      setError(message);
      setStatus(null);
    }
  }

  if (!canRun) {
    return (
      <p className="text-sm text-ink-500">
        Sign in as admin/developer/operator to run the Ticket Similarity demo.
      </p>
    );
  }

  return (
    <div
      className={
        compact
          ? ""
          : "rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50 to-sky-50 p-6"
      }
    >
      {!compact ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-600">
            Live demo
          </p>
          <h2 className="font-display mt-2 text-2xl font-bold text-ink-950">
            Run Ticket Similarity
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            Submits a sample incident, then opens the live SSE timeline so you can
            watch embed → similar tickets → root cause stream in real time.
          </p>
        </>
      ) : null}
      <div className={`flex flex-wrap items-center gap-3 ${compact ? "" : "mt-5"}`}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runDemo()}
          className="rounded-md bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? "Starting…" : "▶ Run live demo"}
        </button>
        {status ? <span className="text-sm text-ink-600">{status}</span> : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
