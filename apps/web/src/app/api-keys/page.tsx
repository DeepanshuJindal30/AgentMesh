"use client";

import { useState } from "react";
import { AppShell, useRequireSession } from "@/components/AppShell";
import { useCreateApiKeyMutation, useListApiKeysQuery, useMeQuery } from "@/lib/api";

export default function ApiKeysPage() {
  const session = useRequireSession();
  const { data: me } = useMeQuery(undefined, { skip: !session.accessToken });
  const canManage = me?.permissions.includes("apikey:manage") ?? false;
  const { data, isLoading } = useListApiKeysQuery(undefined, {
    skip: !session.accessToken || !canManage,
  });
  const [createKey, createState] = useCreateApiKeyMutation();
  const [createdPlaintext, setCreatedPlaintext] = useState<string | null>(null);

  if (!session.accessToken) return null;

  return (
    <AppShell session={session}>
      <h1 className="font-display text-3xl font-semibold">API keys</h1>
      {!canManage ? (
        <p className="mt-4 text-sm text-ink-500">Only organization admins can manage API keys.</p>
      ) : (
        <>
          <button
            type="button"
            disabled={createState.isLoading}
            className="mt-4 rounded bg-accent-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={async () => {
              const created = await createKey({ name: `key-${Date.now()}` }).unwrap();
              setCreatedPlaintext(created.api_key);
            }}
          >
            Create API key
          </button>
          {createdPlaintext ? (
            <p role="status" className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
              Copy now (shown once): <code className="break-all">{createdPlaintext}</code>
            </p>
          ) : null}
          {isLoading ? <p className="mt-4 text-ink-500">Loading…</p> : null}
          <ul className="mt-6 divide-y divide-slate-200 rounded border border-slate-200 bg-white/80">
            {(data ?? []).map((key) => (
              <li key={key.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{key.name}</span>
                <span className="font-mono text-xs text-ink-500">{key.key_prefix}…</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
