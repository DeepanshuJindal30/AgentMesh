import Link from "next/link";
import { DOC_NAV } from "@/content/docs";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export function DocsShell({
  children,
  activeSlug,
}: {
  children: React.ReactNode;
  activeSlug?: string;
}) {
  return (
    <div className="min-h-screen bg-[#eef3f6]">
      <SiteHeader />
      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
        <aside className="hidden w-56 shrink-0 md:block">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
            Documentation
          </p>
          <nav className="mt-6 space-y-8">
            {DOC_NAV.map((group) => (
              <div key={group.section}>
                <p className="text-xs font-semibold text-ink-950">{group.section}</p>
                <ul className="mt-3 space-y-2">
                  {group.items.map((item) => {
                    const active = item.slug === activeSlug;
                    return (
                      <li key={item.slug}>
                        <Link
                          href={`/docs/${item.slug}`}
                          className={`block text-sm transition ${
                            active
                              ? "font-semibold text-accent-600"
                              : "text-ink-700 hover:text-accent-600"
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="mt-10 border-t border-slate-200 pt-6">
            <a
              href="http://localhost:8000/docs"
              className="text-sm font-semibold text-ink-700 hover:text-accent-600"
            >
              OpenAPI playground →
            </a>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
