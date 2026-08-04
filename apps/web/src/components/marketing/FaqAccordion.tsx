"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What is AgentMesh?",
    a: "AgentMesh is a multi-tenant AI agent execution platform. You define versioned agents, submit durable executions, stream live step events over SSE, and operate the system with RBAC, quotas, API keys, audit logs, and Prometheus metrics.",
  },
  {
    q: "How is this different from a chatbot app?",
    a: "Chat wrappers hide the hard parts. AgentMesh surfaces durable queues (RabbitMQ + Celery), at-least-once delivery with idempotency, a typed gRPC runtime for streaming steps, tenant isolation, and crash-safe workers — the systems work enterprise agent platforms require.",
  },
  {
    q: "What is the Ticket Similarity Agent?",
    a: "The sample agent embeds a new incident, finds similar historical tickets via pgvector-style similarity (mock embeddings locally), and returns likely root cause, previous owner, repository, and investigation steps — streamed live to the UI.",
  },
  {
    q: "Do I need a paid LLM?",
    a: "No. The default provider is mock for a free local stack. You can later wire an OpenAI-compatible provider. Observability (Prometheus/Grafana) is optional via the Compose monitoring profile.",
  },
  {
    q: "How does live progress work?",
    a: "Workers persist each runtime step to Postgres and publish to Redis Pub/Sub. The API’s SSE endpoint replays history from the database and tails live events so reconnects stay consistent.",
  },
  {
    q: "Is authentication production-ready?",
    a: "Keycloak provides OIDC. Local demos also support a safe auth bypass with HS256 tokens. A production hardening path is BFF + HttpOnly cookies instead of storing bearer tokens in the browser.",
  },
] as const;

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="font-display text-lg font-semibold text-ink-950">{item.q}</span>
              <span className="text-accent-600">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen ? (
              <p className="pb-5 text-[15px] leading-7 text-ink-700">{item.a}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
