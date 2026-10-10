import type { CardLine } from "@app/lib/labels";
import { NOT_YET } from "@app/lib/understood";

// The read-only "What I've understood" panel, desktop only: below lg the card already shows
// everything. No edit controls (#132).
export function UnderstoodPanel({ lines }: { lines: CardLine[] }) {
  return (
    <aside
      aria-label="What Step Up has understood"
      className="hidden rounded-xl border border-line bg-card p-4 lg:sticky lg:top-6 lg:block lg:self-start"
    >
      <h2 className="mb-3 font-display text-lg font-semibold">What I&apos;ve understood</h2>
      <dl className="flex flex-col gap-2.5 text-sm">
        {lines.map((line, i) => (
          <div key={i}>
            <dt className="text-muted">{line.label}</dt>
            <dd className={line.value === NOT_YET ? "text-muted" : "font-medium"}>{line.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
