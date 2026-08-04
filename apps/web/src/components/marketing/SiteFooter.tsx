import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-[#0b1628] text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl font-bold text-white">AgentMesh</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            Multi-tenant AI agent execution platform: durable queues, gRPC runtime,
            live SSE, RBAC, and observability — built as a production-grade portfolio
            system.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Product
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/#features" className="hover:text-white">
                Features
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="hover:text-white">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Console
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Developers
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/docs" className="hover:text-white">
                Documentation
              </Link>
            </li>
            <li>
              <Link href="/docs/api" className="hover:text-white">
                API reference
              </Link>
            </li>
            <li>
              <a href="http://localhost:8000/docs" className="hover:text-white">
                OpenAPI
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-5 text-center text-xs text-slate-500">
        AgentMesh · local / portfolio deployment · MIT educational license
      </div>
    </footer>
  );
}
