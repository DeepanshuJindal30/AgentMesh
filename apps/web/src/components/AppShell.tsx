"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearSession, type SessionState } from "@/lib/sessionSlice";
import type { RootState } from "@/lib/store";

export function useRequireSession(): SessionState {
  const session = useSelector((s: RootState) => s.session);
  const router = useRouter();
  useEffect(() => {
    if (!session.accessToken) router.replace("/login");
  }, [session.accessToken, router]);
  return session;
}

export function AppShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: SessionState;
}) {
  const dispatch = useDispatch();
  const router = useRouter();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Link href="/dashboard" className="font-display text-xl font-semibold text-ink-950">
              AgentMesh
            </Link>
            <p className="text-xs text-ink-500">
              {session.organizationName} · {session.role}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:text-accent-600">
              Dashboard
            </Link>
            <Link href="/agents" className="hover:text-accent-600">
              Agents
            </Link>
            <Link href="/executions" className="hover:text-accent-600">
              Executions
            </Link>
            <Link href="/members" className="hover:text-accent-600">
              Members
            </Link>
            <Link href="/usage" className="hover:text-accent-600">
              Usage
            </Link>
            <Link href="/api-keys" className="hover:text-accent-600">
              API keys
            </Link>
            <Link href="/audit-logs" className="hover:text-accent-600">
              Audit
            </Link>
            <Link href="/docs" className="hover:text-accent-600">
              Docs
            </Link>
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-1.5"
              onClick={() => {
                dispatch(clearSession());
                router.push("/login");
              }}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
