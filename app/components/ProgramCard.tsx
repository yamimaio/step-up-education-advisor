import { useId } from "react";
import type { CheckStatus } from "@core/engine/types";
import { DRAFT_LABEL, isWebLink, type ProgramView } from "@app/lib/programs";
import { Disclosure } from "./Disclosure";

// One program: facts from its record, checks, fit and confidence from the engine (programView),
// never model text. The status of each check is written out, so it doesn't rely on colour.
// `rank`: its place in the ranked list, shown as a number before the name; "Also worth a look"
// has none. Screen readers get the order from the list, so the number is hidden from them.

// The pill shape and padding of the chips, at badge size.
const PILL = "inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium";

const STATUS_STYLE: Record<CheckStatus, string> = {
  pass: "bg-teal-soft text-teal",
  near_miss: "bg-amber-100 text-amber-900",
  fail: "bg-red-100 text-red-900",
};

export function ProgramCard({ program: p, rank }: { program: ProgramView; rank?: number }) {
  const headingId = useId();
  return (
    <article
      aria-labelledby={headingId}
      className="rounded-xl border border-line bg-card p-4 text-sm"
    >
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-soft font-semibold text-teal"
          >
            {rank}
          </span>
        )}
        <div className="min-w-0">
          <h3 id={headingId} className="font-display text-lg font-semibold">
            {p.name}
          </h3>
          <p className="text-muted">{p.institution}</p>
        </div>
      </div>
      {p.draft && <p className={`mt-2 ${PILL} bg-amber-100 text-amber-900`}>{DRAFT_LABEL}</p>}
      <p className="mt-3 font-medium">{p.why}</p>

      <h4 className="mt-3 font-semibold">Your limits</h4>
      <ul className="mt-1 space-y-1.5">
        {p.checks.map((c) => (
          <li key={c.label} className="flex items-baseline gap-2">
            <span className={`${PILL} ${STATUS_STYLE[c.status]}`}>{c.statusText}</span>
            <span className="min-w-0">
              {c.label}
              {c.detail && <span className="text-muted">: {c.detail}</span>}
            </span>
          </li>
        ))}
      </ul>

      <h4 className="mt-3 font-semibold">The program</h4>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {p.facts.map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-muted">{f.label}</dt>
            <dd>
              {f.value}
              {f.note && <span className="block text-xs text-muted">{f.note}</span>}
            </dd>
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
        <p className="mt-1 text-muted">
          {p.draft ? "Sources checked on" : "Verified on"} {p.checkedOn}
        </p>
      )}
      <Disclosure className="mt-2" summary={`Sources (${p.sources.length})`}>
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
              <span className="text-muted">, checked {s.checkedOn}</span>
            </li>
          ))}
        </ul>
      </Disclosure>
    </article>
  );
}
