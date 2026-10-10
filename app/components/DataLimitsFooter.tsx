import { dataLimits, programRecords } from "@app/lib/programs";
import type { Program } from "@core/schema/program";

// The data-limits note under the program cards: the dataset's size, region and verification
// window, and that it is not a complete list. From the records only.
export function DataLimitsFooter({ programs = programRecords() }: { programs?: Program[] }) {
  return <p className="border-t border-line pt-3 text-xs text-muted">{dataLimits(programs)}</p>;
}
