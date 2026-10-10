import { NOT_YET, type Understood } from "@app/lib/understood";

// The read-only "What I've understood" panel, desktop only: below lg the card already shows
// everything. No edit controls (#132). After "Change something", the note quotes the user's
// correction, so the card's old values read as being updated, not as understood.
export function UnderstoodPanel({ lines, note }: Understood) {
  return (
    <aside
      aria-label="What Step Up has understood"
      className="hidden rounded-xl border border-line bg-card p-4 lg:sticky lg:top-16 lg:block lg:self-start"
    >
      <h2 className="mb-3 font-display text-lg font-semibold">What I&apos;ve understood</h2>
      {note !== null && (
        <p className="mb-3 rounded-lg bg-teal-soft p-2 text-sm whitespace-pre-wrap wrap-anywhere">
          Updating with your change: &ldquo;{note}&rdquo;
        </p>
      )}
      <dl className="flex flex-col gap-2.5 text-sm wrap-anywhere">
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
