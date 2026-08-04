"use client";

import { AppShell, useRequireSession } from "@/components/AppShell";
import { useGetUsageQuery } from "@/lib/api";

export default function UsagePage() {
  const session = useRequireSession();
  const { data, isLoading, error } = useGetUsageQuery(undefined, {
    skip: !session.accessToken,
  });
  if (!session.accessToken) return null;
  return (
    <AppShell session={session}>
      <h1 className="font-display text-3xl font-semibold">Usage & quotas</h1>
      {isLoading ? <p className="mt-4 text-ink-500">Loading…</p> : null}
      {error ? (
        <p role="alert" className="mt-4 text-red-700">
          Failed to load usage
        </p>
      ) : null}
      {data ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card
            title="Executions this month"
            value={`${data.executions_used_month} / ${data.monthly_execution_quota}`}
            hint={`${data.executions_remaining} remaining`}
          />
          <Card
            title="Tokens this month"
            value={`${data.tokens_used_month} / ${data.monthly_token_quota}`}
            hint={`${data.tokens_remaining} remaining`}
          />
          <Card
            title="Max concurrent executions"
            value={String(data.max_concurrent_executions)}
          />
          <Card title="Requests per minute" value={String(data.requests_per_minute)} />
        </div>
      ) : null}
    </AppShell>
  );
}

function Card({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <section className="rounded border border-slate-200 bg-white/80 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</h2>
      <p className="mt-2 font-display text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-sm text-ink-500">{hint}</p> : null}
    </section>
  );
}
