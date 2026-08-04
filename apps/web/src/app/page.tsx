import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { PipelineVisual } from "@/components/marketing/PipelineVisual";
import { CodeTabs } from "@/components/marketing/CodeTabs";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { SystemStatus } from "@/components/SystemStatus";

const FEATURES = [
  {
    title: "Durable executions",
    body: "RabbitMQ + Celery with retries, DLQ, and idempotency keys. Submit returns 202; work survives crashes.",
  },
  {
    title: "Live SSE monitoring",
    body: "Step events persist in Postgres and fan out over Redis Pub/Sub. Reconnects catch up without gaps.",
  },
  {
    title: "Multi-tenant RBAC",
    body: "Organizations, membership roles (Admin / Developer / Operator / Viewer), and permission-checked APIs.",
  },
  {
    title: "gRPC agent runtime",
    body: "Typed internal streaming for Ticket Similarity and future agents — REST externally, gRPC internally.",
  },
  {
    title: "Ops-ready controls",
    body: "Rate limits, quotas, hashed API keys, append-only audit logs, Prometheus metrics, Grafana dashboards.",
  },
  {
    title: "Ship locally, show K8s",
    body: "Docker Compose for demos; manifests with probes and HPA for interview-ready deployability.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Authenticate into a tenant",
    body: "Sign in via Keycloak (or local bypass). Every request is scoped to an organization membership — never trust a client-supplied tenant id alone.",
  },
  {
    n: "02",
    title: "Publish an immutable agent version",
    body: "Create agents, pin configuration into versions, publish. Executions lock to a version so runs stay reproducible.",
  },
  {
    n: "03",
    title: "Enqueue work, watch it stream",
    body: "POST an execution with an idempotency key. The worker claims the job, streams gRPC steps, and the console renders live SSE.",
  },
];

export default function HomePage() {
  return (
    <div className="mesh-grid min-h-screen">
      <SiteHeader />

      {/* Hero — brand first, one composition */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-end gap-10 px-6 pb-20 pt-16 lg:grid-cols-12 lg:pb-28 lg:pt-24">
          <div className="lg:col-span-7">
            <p className="am-fade-up text-sm font-semibold uppercase tracking-[0.22em] text-accent-600">
              AgentMesh
            </p>
            <h1 className="am-fade-up am-fade-up-delay-1 font-display mt-4 text-5xl font-extrabold tracking-tight text-ink-950 sm:text-6xl lg:text-[4.25rem] lg:leading-[1.05]">
              Run AI agents like production systems
            </h1>
            <p className="am-fade-up am-fade-up-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-ink-700">
              Multi-tenant execution platform with durable queues, gRPC streaming
              runtime, live SSE, and ops controls — not another chatbot wrapper.
            </p>
            <div className="am-fade-up am-fade-up-delay-3 mt-9 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Open console & run demo
          </Link>
          <Link
            href="/docs/getting-started"
            className="rounded-md border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-ink-950 transition hover:border-teal-600/40"
          >
            Read the docs
          </Link>
            </div>
          </div>
          <div className="am-fade-up am-fade-up-delay-2 lg:col-span-5">
            <SystemStatus />
          </div>
        </div>
      </section>

      <PipelineVisual />

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-600">
            Developer first
          </p>
          <h2 className="font-display mt-3 max-w-2xl text-4xl font-bold tracking-tight text-ink-950">
            Everything an agent platform needs after “hello world”
          </h2>
          <p className="mt-4 max-w-2xl text-ink-700">
            Isolation, durability, live observability, and operable APIs — the
            infrastructure layer between your models and your customers.
          </p>
          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <h3 className="font-display text-xl font-bold text-ink-950">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-ink-700">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-y border-slate-200/80 bg-white/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-600">
            How it works
          </p>
          <h2 className="font-display mt-3 text-4xl font-bold tracking-tight text-ink-950">
            Three steps from tenant to live timeline
          </h2>
          <ol className="mt-14 space-y-10">
            {STEPS.map((s) => (
              <li key={s.n} className="grid gap-4 md:grid-cols-[88px_1fr] md:gap-8">
                <span className="font-display text-3xl font-bold text-teal-700/40">{s.n}</span>
                <div>
                  <h3 className="font-display text-2xl font-bold text-ink-950">{s.title}</h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-7 text-ink-700">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Architecture + code */}
      <section id="architecture" className="scroll-mt-20 py-24">
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-600">
              Architecture
            </p>
            <h2 className="font-display mt-3 text-4xl font-bold tracking-tight text-ink-950">
              REST outside. gRPC inside. Queues for durability.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-ink-700">
              Browsers and partners talk HTTP/SSE. Workers talk a typed streaming
              runtime. RabbitMQ owns crash recovery. Redis fans out live events.
              Postgres is the system of record — including append-only audit and
              execution history.
            </p>
            <ul className="mt-6 space-y-3 text-[15px] text-ink-700">
              <li>
                <strong className="text-ink-950">At-least-once</strong> delivery with
                atomic claim transitions and idempotent handlers
              </li>
              <li>
                <strong className="text-ink-950">Shared-schema tenancy</strong> with
                membership-derived organization scope
              </li>
              <li>
                <strong className="text-ink-950">Immutable versions</strong> for
                reproducible agent runs
              </li>
            </ul>
            <Link
              href="/docs/architecture"
              className="mt-8 inline-flex text-sm font-semibold text-accent-600 hover:underline"
            >
              Full architecture guide →
            </Link>
          </div>
          <CodeTabs />
        </div>
      </section>

      {/* Sample agent */}
      <section className="border-y border-slate-200/80 bg-[#0b1628] py-24 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300/80">
            Sample agent
          </p>
          <h2 className="font-display mt-3 max-w-2xl text-4xl font-bold tracking-tight">
            Ticket Similarity that ships with the platform
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-300">
            Feed an incident. Get similar historical tickets, likely root cause,
            previous owner, repository, and investigation steps — streamed as
            steps so demos feel alive.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ["Embed query", "Mock or real embeddings for the incident text"],
              ["Retrieve neighbors", "Similarity search over historical tickets"],
              ["Summarize evidence", "Root cause + next steps for operators"],
            ].map(([t, d]) => (
              <div key={t} className="border-l border-teal-400/40 pl-5">
                <p className="font-display text-lg font-bold">{t}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-600">
            FAQ
          </p>
          <h2 className="font-display mt-3 text-4xl font-bold tracking-tight text-ink-950">
            What people ask in interviews and demos
          </h2>
          <div className="mt-10">
            <FaqAccordion />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-800 via-teal-700 to-sky-800 px-8 py-14 text-white sm:px-14">
            <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <h2 className="font-display relative text-3xl font-bold sm:text-4xl">
              Ready to run the demo?
            </h2>
            <p className="relative mt-3 max-w-xl text-teal-50/90">
              Sign in with the local demo accounts, publish an agent version, and
              watch Ticket Similarity stream live. Docs cover every layer.
            </p>
            <div className="relative mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-teal-900"
              >
                Open console
              </Link>
              <Link
                href="/docs/getting-started"
                className="rounded-md border border-white/40 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Getting started
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
