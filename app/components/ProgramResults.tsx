import { useId } from "react";
import type { Results } from "@app/lib/chatState";
import { programRecords, resultsView } from "@app/lib/programs";
import type { Program } from "@core/schema/program";
import { DataLimitsFooter } from "./DataLimitsFooter";
import { ProgramCard } from "./ProgramCard";

// Stage 2's answer: the confirmed category's programs ranked by the user's needs, then up to two
// under "Also worth a look", from the engine result and the records only, never model text.
// When the category has nothing within the limits, the access note says so and names the
// alternative whose programs fill "Also worth a look".
// `programs`: the records, loadPrograms() unless a test passes fixtures.
export function ProgramResults({
  results,
  programs = programRecords(),
}: {
  results: Results;
  programs?: Program[];
}) {
  const headingId = useId();
  const v = resultsView(results, programs);
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border-2 border-teal bg-white/60 p-4 shadow-sm"
    >
      <h2 id={headingId} className="text-sm font-semibold uppercase tracking-wide text-teal">
        Programs that fit
      </h2>
      {v.notYet && <p className="text-lg font-semibold">{v.notYet}</p>}
      {v.access && <p>{v.access}</p>}
      {v.ranked.length > 0 && (
        <>
          {v.category && (
            <p className="text-sm text-ink/70">{v.category}: best fit for your needs first</p>
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
        <>
          <h3 className="mt-2 font-semibold text-teal">Also worth a look</h3>
          <ul className="flex flex-col gap-3">
            {v.alsoWorthALook.map((p) => (
              <li key={p.id}>
                <ProgramCard program={p} />
              </li>
            ))}
          </ul>
        </>
      )}
      {v.notAnswered.length > 0 && (
        <p className="text-sm">Ranked without: {v.notAnswered.join(", ")}</p>
      )}
      <DataLimitsFooter programs={programs} />
    </section>
  );
}
