import { useId } from "react";
import type { CheckStatus } from "@core/engine/types";
import { DRAFT_LABEL, type ProgramView } from "@app/lib/programs";

// One program: facts from its record, checks, fit and confidence from the engine (programView),
// never model text. The status of each check is written out, so it doesn't rely on colour.

const STATUS_STYLE: Record<CheckStatus, string> = {
  pass: "bg-teal/10 text-teal",
  near_miss: "bg-amber-100 text-amber-900",
  fail: "bg-red-100 text-red-900",
};

// Records hold school pages; anything that isn't a web link shows as plain text.
const isWebLink = (url: string) => /^https?:\/\//i.test(url);

export function ProgramCard({ program: p }: { program: ProgramView }) {
  const headingId = useId();
  return (
    <article
      aria-labelledby={headingId}
      className="rounded-lg border border-teal/40 bg-white/80 p-4 text-sm shadow-sm"
    >
      <h3 id={headingId} className="text-lg font-semibold text-teal">
        {p.name}
      </h3>
      <p className="text-ink/70">{p.institution}</p>
      {p.draft && (
        <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
          {DRAFT_LABEL}
        </p>
      )}
      <p className="mt-2 font-medium">{p.why}</p>

      <h4 className="mt-3 font-semibold">Your limits</h4>
      <ul className="mt-1 space-y-1">
        {p.checks.map((c) => (
          <li key={c.label}>
            <span
              className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`}
            >
              {c.statusText}
            </span>
            {c.label}
            {c.detail && <span className="text-ink/80">: {c.detail}</span>}
          </li>
        ))}
      </ul>

      <h4 className="mt-3 font-semibold">The program</h4>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {p.facts.map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-ink/70">{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>

      <h4 className="mt-3 font-semibold">How it serves what you need</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {p.fit.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      <p className="mt-3">
        <span className="font-semibold">Confidence: {p.confidence.level}.</span>{" "}
        {p.confidence.reasons.join(" ")}
      </p>
      {p.checkedOn && (
        <p className="mt-1 text-ink/70">
          {p.draft ? "Sources checked on" : "Verified on"} {p.checkedOn}
        </p>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer text-teal">Sources ({p.sources.length})</summary>
        <ul className="mt-1 space-y-1">
          {p.sources.map((s, i) => (
            <li key={i}>
              {s.url && isWebLink(s.url) ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal underline"
                >
                  {s.label}
                </a>
              ) : (
                s.label
              )}
              <span className="text-ink/70">, checked {s.checkedOn}</span>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
