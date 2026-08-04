import Link from "next/link";
import { SystemStatus } from "@/components/SystemStatus";

export default function HomePage() {
  return (
    <main className="mesh-grid relative min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent-600">
          Multi-tenant agent platform
        </p>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-ink-950 sm:text-6xl">
          AgentMesh
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-700">
          Create versioned AI agents, run durable executions, and monitor live
          progress — with tenant isolation and RBAC.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Sign in
          </Link>
          <a
            href="http://localhost:8000/docs"
            className="rounded border border-slate-300 bg-white/70 px-5 py-2.5 text-sm font-semibold text-ink-900"
          >
            API docs
          </a>
        </div>
        <div className="mt-10">
          <SystemStatus />
        </div>
      </div>
    </main>
  );
}
