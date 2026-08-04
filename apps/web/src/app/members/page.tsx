"use client";

import { AppShell, useRequireSession } from "@/components/AppShell";
import { useListMembersQuery } from "@/lib/api";

export default function MembersPage() {
  const session = useRequireSession();
  const { data, isLoading } = useListMembersQuery(undefined, {
    skip: !session.accessToken,
  });
  if (!session.accessToken) return null;
  return (
    <AppShell session={session}>
      <h1 className="font-display text-3xl font-semibold">Members</h1>
      {isLoading ? <p className="mt-4 text-ink-500">Loading…</p> : null}
      <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white/80">
        {(data ?? []).map((m) => (
          <li key={m.id} className="flex justify-between px-6 py-4 text-sm">
            <div>
              <p className="font-medium">{m.display_name}</p>
              <p className="text-ink-500">{m.email}</p>
            </div>
            <span className="capitalize">{m.role.replace("_", " ")}</span>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
