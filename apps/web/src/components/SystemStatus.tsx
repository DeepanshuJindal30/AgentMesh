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
  | { kind: "cloud-only" }
  | { kind: "error"; message: string }
  | { kind: "ok"; health: HealthPayload; ready: ReadyPayload };

function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:8000";
}

function isBrowserOnCloudHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host.endsWith(".vercel.app") ||
    host.endsWith(".netlify.app") ||
    host.endsWith(".onrender.com") ||
    (host !== "localhost" && host !== "127.0.0.1")
  );
}

function isLocalApiUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function SystemStatus() {
  const apiUrl = resolveApiUrl();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    // Vercel (or any public host) cannot reach the visitor's localhost API.
    if (isBrowserOnCloudHost() && isLocalApiUrl(apiUrl)) {
      setState({ kind: "cloud-only" });
      return;
    }

    async function load() {
      try {
        const [healthRes, readyRes] = await Promise.all([
          fetch(`${apiUrl}/health`, { cache: "no-store" }),
          fetch(`${apiUrl}/ready`, { cache: "no-store" }),
        ]);
        if (!healthRes.ok) {
          throw new Error(`Health check failed (${healthRes.status})`);
        }
        const health = (await healthRes.json()) as HealthPayload;
        const ready = readyRes.ok
          ? ((await readyRes.json()) as ReadyPayload)
          : { status: "unknown", checks: {} };
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
  }, [apiUrl]);

  if (state.kind === "loading") {
    return (
      <div
        className="h-36 w-full max-w-xl animate-pulse rounded-lg bg-white/60"
        aria-busy="true"
        aria-label="Loading system status"
      />
    );
  }

  if (state.kind === "cloud-only") {
    return (
      <section
        aria-label="System status"
        className="max-w-xl rounded-lg border border-sky-200 bg-sky-50 px-5 py-4 text-sky-950"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
          Frontend online
        </p>
        <p className="mt-2 text-sm leading-6">
          This Vercel deploy serves the marketing site, docs, and console UI.
          The API (queues, workers, gRPC) is not wired here yet — browsers cannot
          call <code className="rounded bg-white/80 px-1">localhost:8000</code>.
        </p>
        <p className="mt-3 text-sm leading-6">
          <strong>Full live demo:</strong> run Docker Compose locally, or deploy
          the Render blueprint and set{" "}
          <code className="rounded bg-white/80 px-1">NEXT_PUBLIC_API_URL</code>.
        </p>
        <a
          href="https://github.com/DeepanshuJindal30/AgentMesh/blob/master/docs/cloud-deploy.md"
          className="mt-3 inline-block text-sm font-semibold text-sky-800 underline-offset-2 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Cloud deploy guide →
        </a>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        role="alert"
        className="max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950"
      >
        <p className="font-medium">API unreachable</p>
        <p className="mt-1 text-sm opacity-90">{state.message}</p>
        <p className="mt-2 text-sm">
          Expected API at <code className="rounded bg-white/70 px-1">{apiUrl}</code>
        </p>
        <p className="mt-2 text-sm text-amber-900/80">
          Start the stack with <code className="rounded bg-white/70 px-1">docker compose up -d</code>{" "}
          or set <code className="rounded bg-white/70 px-1">NEXT_PUBLIC_API_URL</code> to your
          public API.
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
