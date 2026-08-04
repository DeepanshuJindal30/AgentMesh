function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(md: string): string {
  return escapeHtml(md)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function isTableSep(line: string): boolean {
  return /^\|?\s*-+/.test(line.replace(/\|/g, " ").trim()) || /^\|(\s*:?-+:?\s*\|)+/.test(line);
}

/** Minimal markdown → HTML for docs pages. */
export function renderDocsMarkdown(source: string): string {
  const lines = source.trim().split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        buf.push(lines[i] ?? "");
        i += 1;
      }
      i += 1;
      out.push(
        `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(buf.join("\n"))}</code></pre>`,
      );
      continue;
    }

    const next = lines[i + 1] ?? "";
    if (line.startsWith("|") && isTableSep(next)) {
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith("|")) {
        const current = lines[i] ?? "";
        const row = current
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (!row.every((c) => /^:?-+:?$/.test(c))) rows.push(row);
        i += 1;
      }
      const head = rows[0];
      if (head) {
        const body = rows.slice(1);
        out.push("<table><thead><tr>");
        for (const c of head) out.push(`<th>${inline(c)}</th>`);
        out.push("</tr></thead><tbody>");
        for (const r of body) {
          out.push("<tr>");
          for (const c of r) out.push(`<td>${inline(c)}</td>`);
          out.push("</tr>");
        }
        out.push("</tbody></table>");
      }
      continue;
    }

    if (line.startsWith("## ")) {
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
      i += 1;
      continue;
    }

    if (/^[-*] /.test(line)) {
      out.push("<ul>");
      while (i < lines.length && /^[-*] /.test(lines[i] ?? "")) {
        out.push(`<li>${inline((lines[i] ?? "").replace(/^[-*] /, ""))}</li>`);
        i += 1;
      }
      out.push("</ul>");
      continue;
    }

    if (/^\d+\. /.test(line)) {
      out.push("<ol>");
      while (i < lines.length && /^\d+\. /.test(lines[i] ?? "")) {
        out.push(`<li>${inline((lines[i] ?? "").replace(/^\d+\. /, ""))}</li>`);
        i += 1;
      }
      out.push("</ol>");
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const cur = lines[i] ?? "";
      if (
        !cur.trim() ||
        cur.startsWith("#") ||
        cur.startsWith("|") ||
        cur.startsWith("```") ||
        /^[-*] /.test(cur) ||
        /^\d+\. /.test(cur)
      ) {
        break;
      }
      para.push(cur);
      i += 1;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}
