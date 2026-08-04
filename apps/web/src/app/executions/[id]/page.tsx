"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell, useRequireSession } from "@/components/AppShell";
import { useGetExecutionQuery } from "@/lib/api";
import type { RootState } from "@/lib/store";
import { useSelector } from "react-redux";

type LiveEvent = {
  sequence_number: number;
  event_type: string;
  message: string;
  payload?: Record<string, unknown>;
  is_terminal?: boolean;
  error_code?: string | null;
  worker_id?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ExecutionDetailPage() {
  const params = useParams<{ id: string }>();
  const executionId = params.id;
  const session = useRequireSession();
  const token = useSelector((s: RootState) => s.session.accessToken);
  const orgId = useSelector((s: RootState) => s.session.organizationId);
  const { data: execution, refetch } = useGetExecutionQuery(executionId, {
    skip: !session.accessToken || !executionId,
    pollingInterval: 3000,
  });
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orgId || !executionId) return;
    let cancelled = false;
    let lastId = 0;
    const controller = new AbortController();

    async function consume() {
      try {
        const res = await fetch(`${API_URL}/api/v1/executions/${executionId}/events`, {
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
            "X-Organization-Id": orgId!,
            ...(lastId ? { "Last-Event-ID": String(lastId) } : {}),
          },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`SSE failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const lines = chunk.split("\n");
            let id: string | null = null;
            let data: string | null = null;
            for (const line of lines) {
              if (line.startsWith("id:")) id = line.slice(3).trim();
              if (line.startsWith("data:")) data = line.slice(5).trim();
            }
            if (!data) continue;
            const parsed = JSON.parse(data) as LiveEvent;
            if (id) lastId = Number(id);
            setEvents((prev) => {
              if (prev.some((e) => e.sequence_number === parsed.sequence_number)) return prev;
              return [...prev, parsed].sort((a, b) => a.sequence_number - b.sequence_number);
            });
            if (parsed.is_terminal) {
              void refetch();
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setStreamError(err instanceof Error ? err.message : "stream error");
        }
      }
    }

    void consume();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, orgId, executionId, refetch]);

  const duration = useMemo(() => {
    if (!execution?.started_at) return "—";
    const start = new Date(execution.started_at).getTime();
    const end = execution.finished_at ? new Date(execution.finished_at).getTime() : Date.now();
    return `${Math.max(0, Math.round((end - start) / 1000))}s`;
  }, [execution]);

  if (!session.accessToken) return null;

  return (
    <AppShell session={session}>
      <div className="mb-4 text-sm">
        <Link href="/executions" className="text-accent-600 hover:underline">
          ← Executions
        </Link>
      </div>
      <h1 className="font-display text-3xl font-semibold">Execution</h1>
      <p className="mt-1 font-mono text-xs text-ink-500">{executionId}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="Status" value={execution?.status ?? "…"} />
        <Stat label="Retries" value={String(execution?.retry_count ?? 0)} />
        <Stat label="Tokens" value={String(execution?.token_usage_total ?? 0)} />
        <Stat label="Duration" value={duration} />
      </div>

      {streamError ? (
        <p role="alert" className="mt-4 text-sm text-amber-800">
          Live stream: {streamError} (status still polls)
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-500">Live events via SSE</p>
      )}

      <ol className="mt-4 space-y-3">
        {events.length === 0 ? (
          <li className="rounded border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-ink-500">
            Waiting for worker events…
          </li>
        ) : (
          events.map((event) => (
            <li
              key={event.sequence_number}
              className="rounded border border-slate-200 bg-white/85 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{event.event_type}</span>
                <span className="text-xs text-ink-500">#{event.sequence_number}</span>
              </div>
              <p className="mt-1 text-sm text-ink-700">{event.message}</p>
              {event.payload && Object.keys(event.payload).length > 0 ? (
                <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-xs">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              ) : null}
            </li>
          ))
        )}
      </ol>

      {execution?.output_payload ? (
        <section className="mt-8 rounded border border-slate-200 bg-white/85 p-4">
          <h2 className="font-semibold">Final output</h2>
          <pre className="mt-2 overflow-x-auto text-xs">
            {JSON.stringify(execution.output_payload, null, 2)}
          </pre>
        </section>
      ) : null}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white/80 p-4">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
