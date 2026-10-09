import { useId } from "react";
import type { Verdict } from "@app/lib/chatState";
import { verdictView } from "@app/lib/verdict";

// The category verdict, from the engine result and the confirmed card only, never model text.
export function VerdictBlock({ verdict }: { verdict: Verdict }) {
  const headingId = useId();
  const v = verdictView(verdict);
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border-2 border-teal bg-white/80 p-4 shadow-sm"
    >
      <h2 id={headingId} className="text-sm font-semibold uppercase tracking-wide text-teal">
        Your verdict
      </h2>
      {v.notYet && <p className="mt-2 text-lg font-semibold">{v.notYet}</p>}
      {v.winner && (
        <p className="mt-2">
          <span className="text-2xl font-bold text-teal">{v.winner}</span>
        </p>
      )}
      {v.tie && (
        <p className="mt-2 text-lg font-semibold">
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
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-teal">How each type scored</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-ink/70">
              <th className="py-1 pr-3 font-medium">Type</th>
              <th className="py-1 pr-3 font-medium">Score</th>
              <th className="py-1 font-medium">Why</th>
            </tr>
          </thead>
          <tbody>
            {v.rows.map((row) => (
              <tr key={row.category} className="border-t border-ink/10 align-top">
                <td className="py-1 pr-3">{row.name}</td>
                <td className="py-1 pr-3">{row.score}</td>
                <td className="py-1">{row.reasons.join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
