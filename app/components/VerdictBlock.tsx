import { useId } from "react";
import type { Verdict } from "@app/lib/chatState";
import { verdictView } from "@app/lib/verdict";
import { Disclosure } from "./Disclosure";

// The category verdict, from the engine result and the confirmed card only, never model text.
export function VerdictBlock({ verdict }: { verdict: Verdict }) {
  const headingId = useId();
  const v = verdictView(verdict);
  return (
    <section aria-labelledby={headingId} className="rounded-xl border-2 border-teal bg-card p-4">
      <h2 id={headingId} className="text-sm font-semibold uppercase tracking-wide text-teal">
        Your verdict
      </h2>
      {v.notYet && <p className="mt-2 font-display text-lg font-semibold">{v.notYet}</p>}
      {v.winner && (
        <p className="mt-2">
          <span className="font-display text-2xl font-semibold text-teal">{v.winner}</span>
        </p>
      )}
      {v.tie && (
        <p className="mt-2 font-display text-lg font-semibold">
          A tie between {v.tie[0]} and {v.tie[1]}.
        </p>
      )}
      <ul className="mt-3 space-y-1 text-sm">
        {v.runnerUp && <li>Runner-up: {v.runnerUp}</li>}
        {v.decidingNeeds.length > 0 && <li>Deciding needs: {v.decidingNeeds.join(", ")}</li>}
        {v.tensions.map((t, i) => (
          <li key={i}>You decided: {t}</li>
        ))}
        {v.notAnswered.length > 0 && <li>Not answered: {v.notAnswered.join(", ")}</li>}
      </ul>
      <Disclosure className="mt-3 text-sm" summary="How each type compares">
        <ul className="mt-2 space-y-2">
          {v.rows.map((row) => (
            <li key={row.category} className="border-t border-line pt-2">
              <span className="font-medium">{row.name}</span>
              {row.out && <span className="ml-2 text-muted">(ruled out)</span>}
              <span className="block text-muted">{row.reasons.join(" ")}</span>
            </li>
          ))}
        </ul>
      </Disclosure>
    </section>
  );
}
