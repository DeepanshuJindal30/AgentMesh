import Link from "next/link";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#architecture", label: "Architecture" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#eef3f6]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-ink-950">
          AgentMesh
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-700 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-accent-600">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/docs"
            className="hidden text-sm font-semibold text-ink-700 hover:text-accent-600 sm:inline"
          >
            Documentation
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Open console
          </Link>
        </div>
      </div>
    </header>
  );
}
