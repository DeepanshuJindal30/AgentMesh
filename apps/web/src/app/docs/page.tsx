import Link from "next/link";
import { DOC_NAV, DOCS } from "@/content/docs";
import { DocsShell } from "@/components/docs/DocsShell";

export const metadata = {
  title: "Documentation · AgentMesh",
  description: "Full documentation for the AgentMesh agent execution platform",
};

export default function DocsIndexPage() {
  return (
    <DocsShell>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-600">
        Docs
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-ink-950">
        AgentMesh documentation
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink-700">
        Everything you need to understand, run, and demo the platform — what it
        does, how the durable execution path works, and how to operate it locally.
      </p>

      <div className="mt-12 space-y-10">
        {DOC_NAV.map((group) => (
          <section key={group.section}>
            <h2 className="font-display text-xl font-bold text-ink-950">{group.section}</h2>
            <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {group.items.map((item) => {
                const doc = DOCS.find((d) => d.slug === item.slug);
                return (
                  <li key={item.slug}>
                    <Link
                      href={`/docs/${item.slug}`}
                      className="flex flex-col gap-1 py-4 transition hover:bg-white/60 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                    >
                      <span className="font-semibold text-ink-950">{item.title}</span>
                      <span className="text-sm text-ink-500">{doc?.description}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </DocsShell>
  );
}
