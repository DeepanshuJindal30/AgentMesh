"use client";

import { useEffect, useState } from "react";

type HealthPayload = {
  status: string;
  service: string;
  version: string;
};

type ReadyPayload = {
  status: string;
  checks: Record<string, string>;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; health: HealthPayload; ready: ReadyPayload };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function SystemStatus() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [healthRes, readyRes] = await Promise.all([
          fetch(`${API_URL}/health`, { cache: "no-store" }),
          fetch(`${API_URL}/ready`, { cache: "no-store" }),
        ]);
        if (!healthRes.ok) {
          throw new Error(`Health check failed (${healthRes.status})`);
        }
        const health = (await healthRes.json()) as HealthPayload;
        const ready = (await readyRes.json()) as ReadyPayload;
        if (!cancelled) {
          setState({ kind: "ok", health, ready });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div
        className="h-36 w-full max-w-xl animate-pulse rounded-lg bg-white/60"
        aria-busy="true"
        aria-label="Loading system status"
      />
    );
  }

  if (state.kind === "error") {
    return (
      <div
        role="alert"
        className="max-w-xl rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-900"
      >
        <p className="font-medium">API unreachable</p>
        <p className="mt-1 text-sm opacity-90">{state.message}</p>
        <p className="mt-2 text-sm text-red-800/80">
          Expected API at <code>{API_URL}</code>
        </p>
      </div>
    );
  }

  const { health, ready } = state;

  return (
    <section
      aria-label="System status"
      className="max-w-xl rounded-lg border border-slate-200/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-700">
          System status
        </h2>
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            health.status === "ok"
              ? "bg-teal-100 text-teal-900"
              : "bg-amber-100 text-amber-900"
          }`}
        >
          {health.status}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ink-500">Service</dt>
          <dd className="font-medium">{health.service}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Version</dt>
          <dd className="font-medium">{health.version}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-ink-500">Readiness</dt>
          <dd className="font-medium">{ready.status}</dd>
        </div>
      </dl>
      <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
        {Object.entries(ready.checks).map(([name, value]) => (
          <li key={name} className="flex justify-between gap-4">
            <span className="text-ink-500">{name}</span>
            <span className="font-mono text-xs text-ink-900">{value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
