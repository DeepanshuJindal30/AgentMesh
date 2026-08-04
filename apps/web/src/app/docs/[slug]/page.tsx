import Link from "next/link";
import { notFound } from "next/navigation";
import { DOC_NAV, getAllDocSlugs, getDoc } from "@/content/docs";
import { DocsShell } from "@/components/docs/DocsShell";
import { renderDocsMarkdown } from "@/lib/renderDocsMarkdown";

export function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const doc = getDoc(slug);
    return {
      title: doc ? `${doc.title} · AgentMesh Docs` : "Docs · AgentMesh",
      description: doc?.description,
    };
  });
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const flat = DOC_NAV.flatMap((g) => g.items);
  const idx = flat.findIndex((i) => i.slug === slug);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  const html = renderDocsMarkdown(doc.body);

  return (
    <DocsShell activeSlug={slug}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-600">
        {doc.section}
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-ink-950">
        {doc.title}
      </h1>
      <p className="mt-3 text-ink-700">{doc.description}</p>
      <article
        className="docs-prose mt-8"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <nav className="mt-16 flex flex-col gap-4 border-t border-slate-200 pt-8 sm:flex-row sm:justify-between">
        {prev ? (
          <Link href={`/docs/${prev.slug}`} className="text-sm font-semibold text-accent-600">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/docs/${next.slug}`} className="text-sm font-semibold text-accent-600">
            {next.title} →
          </Link>
        ) : null}
      </nav>
    </DocsShell>
  );
}
