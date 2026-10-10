import type { ReactNode } from "react";

// The small markdown subset the advisor writes: paragraphs, "-" or "*" bullets, "1." lists,
// **bold** and _italic_. Everything else stays plain text. Model text only ever becomes React
// text nodes, never HTML.

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

export function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split("\n")) {
    const last = blocks.at(-1);
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (!line.trim()) {
      blocks.push({ kind: "p", lines: [] });
    } else if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1] ?? "");
      else blocks.push({ kind: "ul", items: [bullet[1] ?? ""] });
    } else if (numbered) {
      if (last?.kind === "ol") last.items.push(numbered[1] ?? "");
      else blocks.push({ kind: "ol", items: [numbered[1] ?? ""] });
    } else if (last?.kind === "p") {
      last.lines.push(line);
    } else {
      blocks.push({ kind: "p", lines: [line] });
    }
  }
  return blocks.filter((b) => (b.kind === "p" ? b.lines.length > 0 : true));
}

// **bold** and _italic_ (or *italic*). An unmatched marker is left as typed.
const INLINE = /\*\*(.+?)\*\*|(?<![\w*])[_*](?![\s_*])(.+?)(?<![\s_*])[_*](?![\w*])/g;

export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let at = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > at) out.push(text.slice(at, match.index));
    out.push(
      match[1] !== undefined ? (
        <strong key={match.index}>{match[1]}</strong>
      ) : (
        <em key={match.index}>{match[2]}</em>
      ),
    );
    at = match.index + match[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {blocksOf(text).map((block, i) =>
        block.kind === "p" ? (
          <p key={i}>{inline(block.lines.join("\n"))}</p>
        ) : block.kind === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="list-decimal space-y-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
}
