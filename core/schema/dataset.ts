import { z } from "zod";
import { ProgramSchema } from "./program";

// Fixture ids start with "fake-"; they belong to tests and never to the real dataset.
export function makeDatasetSchema({ allowFakeIds }: { allowFakeIds: boolean }) {
  return z.array(ProgramSchema).superRefine((programs, ctx) => {
    const seen = new Set<string>();
    programs.forEach((p, i) => {
      if (seen.has(p.id)) {
        ctx.addIssue({ code: "custom", path: [i, "id"], message: `duplicate id "${p.id}"` });
      }
      seen.add(p.id);
      if (!allowFakeIds && p.id.startsWith("fake-")) {
        ctx.addIssue({
          code: "custom",
          path: [i, "id"],
          message: 'ids starting with "fake-" are test fixtures',
        });
      }
    });
  });
}

export const DatasetSchema = makeDatasetSchema({ allowFakeIds: false });
export const FixtureDatasetSchema = makeDatasetSchema({ allowFakeIds: true });

// Every problem as "id › field: message", for the validator script. `today` (YYYY-MM-DD)
// is passed in so this stays pure; a checkedOn later than today is a typo or a made-up date.
export function validateDataset(
  data: unknown,
  today: string,
  schema: typeof DatasetSchema = DatasetSchema,
): string[] {
  const result = schema.safeParse(data);
  const problems: string[] = [];
  const label = (path: PropertyKey[]) => {
    const [index, ...rest] = path;
    const record = Array.isArray(data) && typeof index === "number" ? data[index] : undefined;
    const id =
      record && typeof record === "object" && "id" in record && typeof record.id === "string"
        ? record.id
        : `record ${String(index ?? "")}`.trim();
    return `${id} › ${rest.map(String).join(".") || "(record)"}`;
  };
  if (!result.success) {
    for (const issue of result.error.issues) {
      problems.push(
        Array.isArray(data)
          ? `${label(issue.path)}: ${issue.message}`
          : `dataset: ${issue.message}`,
      );
    }
    return problems;
  }
  result.data.forEach((p) => {
    p.sources.forEach((s, i) => {
      if (s.checkedOn > today) {
        problems.push(`${p.id} › sources.${i}.checkedOn: ${s.checkedOn} is later than ${today}`);
      }
    });
  });
  return problems;
}
