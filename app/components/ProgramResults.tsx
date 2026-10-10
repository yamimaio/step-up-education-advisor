import { useId } from "react";
import type { Results, Verdict } from "@app/lib/chatState";
import { programRecords, resultsView } from "@app/lib/programs";
import type { Program } from "@core/schema/program";
import { DataLimitsFooter } from "./DataLimitsFooter";
import { ProgramCard } from "./ProgramCard";

// Stage 2's answer: the confirmed category's programs ranked by the user's needs, then up to two
// under "Also worth a look", from the engine result and the records only, never model text.
// When the category has nothing within the limits, the access note says so and names the
// alternative whose programs fill "Also worth a look".
// `programs`: the records, loadPrograms() unless a test passes fixtures.
// `verdict`: the confirmed stage 1 result the search ran on (it says whether two types tied).
// The frame matches the verdict's, with a paper interior so the white cards stand out (#219).
export function ProgramResults({
  results,
  verdict = null,
  programs = programRecords(),
}: {
  results: Results;
  verdict?: Verdict | null;
  programs?: Program[];
}) {
  const headingId = useId();
  const v = resultsView(results, programs, verdict);
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-xl border-2 border-teal bg-paper p-4"
    >
      <h2 id={headingId} className="text-sm font-semibold uppercase tracking-wide text-teal">
        Programs that fit
      </h2>
      {v.notYet && <p className="font-display text-lg font-semibold">{v.notYet}</p>}
      {v.access && <p>{v.access}</p>}
      {v.ranked.length > 0 && (
        <>
          {v.category && (
            <p className="text-sm text-muted">{v.category}: best fit for your needs first</p>
          )}
          <ol className="flex flex-col gap-3">
            {v.ranked.map((p) => (
              <li key={p.id}>
                <ProgramCard program={p} />
              </li>
            ))}
          </ol>
        </>
      )}
      {v.alsoWorthALook.length > 0 && (
        <div className="mt-2 flex flex-col gap-3 border-t border-line pt-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-teal">
            Also worth a look
          </h3>
          <ul className="flex flex-col gap-3">
            {v.alsoWorthALook.map((p) => (
              <li key={p.id}>
                <ProgramCard program={p} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {v.notAnswered.length > 0 && (
        <p className="text-sm">Ranked without: {v.notAnswered.join(", ")}</p>
      )}
      <DataLimitsFooter programs={programs} />
    </section>
  );
}
