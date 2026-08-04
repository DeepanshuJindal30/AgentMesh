"use client";

import { AppShell, useRequireSession } from "@/components/AppShell";
import { useListAuditLogsQuery, useMeQuery } from "@/lib/api";

export default function AuditLogsPage() {
  const session = useRequireSession();
  const { data: me } = useMeQuery(undefined, { skip: !session.accessToken });
  const canView = me?.permissions.includes("audit:view") ?? false;
  const { data, isLoading, error } = useListAuditLogsQuery(undefined, {
    skip: !session.accessToken || !canView,
  });
  if (!session.accessToken) return null;
  return (
    <AppShell session={session}>
      <h1 className="font-display text-3xl font-semibold">Audit logs</h1>
      {!canView ? (
        <p className="mt-4 text-sm text-ink-500">You do not have audit:view permission.</p>
      ) : null}
      {isLoading ? <p className="mt-4 text-ink-500">Loading…</p> : null}
      {error ? (
        <p role="alert" className="mt-4 text-red-700">
          Failed to load audit logs
        </p>
      ) : null}
      <ul className="mt-6 divide-y divide-slate-200 rounded border border-slate-200 bg-white/80">
        {(data ?? []).length === 0 ? (
          <li className="p-6 text-sm text-ink-500">No audit events yet.</li>
        ) : (
          (data ?? []).map((row) => (
            <li key={row.id} className="px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{row.action}</span>
                <span className="text-xs text-ink-500">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-ink-500">
                {row.resource_type}
                {row.resource_id ? ` · ${row.resource_id}` : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </AppShell>
  );
}
